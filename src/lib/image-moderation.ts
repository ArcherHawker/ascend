import { supabase } from "./supabase";

export type ImageModResult = { approved: boolean; error?: string; message?: string };

export async function moderateProfileImage(imageBase64: string, userId: string): Promise<ImageModResult> {
  if (!imageBase64.startsWith("data:image/")) return { approved: false, error: "Invalid image format. Please choose a JPG or PNG." };
  const sizeEstimate = (imageBase64.length * 3) / 4;
  if (sizeEstimate > 4 * 1024 * 1024) return { approved: false, error: "Image too large (max 4MB). Try a smaller one." };
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moderate-image`;
    const { data: session } = await supabase.auth.getSession();
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
      body: JSON.stringify({ imageBase64, userId }),
    });
    if (!response.ok) return { approved: true, message: "Image uploaded. Subject to community review." };
    const result = await response.json();
    if (!result.approved) return { approved: false, error: result.error ?? result.message ?? "This image was rejected by AI moderation. Please choose a different profile picture." };
    return { approved: true, message: result.message ?? "Image approved." };
  } catch {
    return { approved: true, message: "Image uploaded. Subject to community review." };
  }
}
