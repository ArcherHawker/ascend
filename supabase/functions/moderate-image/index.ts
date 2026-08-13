import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function isSkinPixel(r: number, g: number, b: number): boolean {
  const rgbRule = r > 95 && g > 40 && b > 20 && Math.max(r, g, b) - Math.min(r, g, b) > 15 && Math.abs(r - g) > 15 && r > g && r > b;
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  const ycbcrRule = y > 80 && cb > 85 && cb < 135 && cr > 135 && cr < 180;
  return rgbRule || ycbcrRule;
}

interface ImageAnalysis { skinRatio: number; isFleshDominant: boolean; hasEnoughVariety: boolean; width: number; height: number; pixelCount: number; }

async function analyzeImage(imageBase64: string): Promise<ImageAnalysis> {
  const match = imageBase64.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data URL");
  const mimeType = match[1];
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: `image/${mimeType}` });
  const bitmap = await createImageBitmap(blob);
  const width = bitmap.width; const height = bitmap.height;
  const sampleSize = 100;
  const sw = Math.min(width, sampleSize); const sh = Math.min(height, sampleSize);
  const canvas = new OffscreenCanvas(sw, sh);
  const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
  ctx.drawImage(bitmap, 0, 0, sw, sh);
  const imageData = ctx.getImageData(0, 0, sw, sh);
  const pixels = imageData.data;
  let skinCount = 0; let totalPixels = 0;
  const colorBuckets = new Set<number>();
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]; const g = pixels[i + 1]; const b = pixels[i + 2];
    if (pixels[i + 3] < 128) continue;
    totalPixels++;
    if (isSkinPixel(r, g, b)) skinCount++;
    const bucket = (Math.floor(r / 64) << 6) | (Math.floor(g / 64) << 3) | Math.floor(b / 64);
    colorBuckets.add(bucket);
  }
  const skinRatio = totalPixels > 0 ? skinCount / totalPixels : 0;
  bitmap.close();
  return { skinRatio, isFleshDominant: skinRatio > 0.42, hasEnoughVariety: colorBuckets.size > 8, width, height, pixelCount: totalPixels };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const { imageBase64, userId } = await req.json();
    if (!imageBase64 || !userId) return modResponse(false, "Missing image or user ID.");
    if (!imageBase64.startsWith("data:image/")) return modResponse(false, "Invalid image format. Please use JPG or PNG.");
    const sizeEstimate = (imageBase64.length * 3) / 4;
    if (sizeEstimate > 4 * 1024 * 1024) return modResponse(false, "Image too large (max 4MB). Please choose a smaller image.");
    if (sizeEstimate < 2 * 1024) return modResponse(false, "Image too small. Please choose a larger image.");

    let analysis: ImageAnalysis;
    try { analysis = await analyzeImage(imageBase64); }
    catch {
      const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
      await supabase.from("profiles").update({ avatar_moderated: true }).eq("id", userId);
      return modResponse(true, "Image uploaded. Subject to community review.");
    }

    if (analysis.width < 32 || analysis.height < 32) return modResponse(false, "Image is too small. Please use at least 32x32 pixels.");
    if (analysis.width > 4096 || analysis.height > 4096) return modResponse(false, "Image is too large. Please use an image under 4096x4096.");
    if (analysis.skinRatio > 0.55) return modResponse(false, "This image appears to contain inappropriate content and has been rejected. Please choose a different profile picture.");
    if (analysis.isFleshDominant && analysis.skinRatio > 0.45) return modResponse(false, "This image appears to contain inappropriate content and has been rejected. Please choose a different profile picture.");
    if (!analysis.hasEnoughVariety && analysis.skinRatio > 0.35) return modResponse(false, "This image appears to contain inappropriate content and has been rejected. Please choose a different profile picture.");

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { error } = await supabase.from("profiles").update({ avatar_moderated: true }).eq("id", userId);
    if (error) return modResponse(false, "Image passed moderation but could not be saved. Please try again.");
    return modResponse(true, "Image approved.");
  } catch {
    return modResponse(false, "Image moderation failed. Please try again.");
  }
});

function modResponse(approved: boolean, message: string): Response {
  return new Response(JSON.stringify({ ok: true, approved, message, error: approved ? undefined : message }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
