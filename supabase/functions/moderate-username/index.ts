import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LEET_MAP: Record<string, string> = {
  "0":"o","1":"i","3":"e","4":"a","5":"s","7":"t","8":"b","2":"z",
  "$":"s","@":"a","!":"i","+":"t","6":"g","9":"g",
};

function normalize(s: string): string {
  let out = "";
  for (const ch of s.toLowerCase()) out += LEET_MAP[ch] ?? ch;
  return out.replace(/[\s_.\-*~`'"|\\<>^()[\]{}=+&%#?!,;:]/g, "");
}

function collapseRepeats(s: string): string { return s.replace(/(.)\1{2,}/g, "$1$1"); }

const PROFANITY_ROOTS = ["fuck","shit","bitch","ass","dick","pussy","cock","cunt","whore","slut","bastard","damn","crap","piss","bollock","wank","prick","twat","minger"];
const SEXUAL_ROOTS = ["porn","porno","xxx","nude","nudes","sex","sexual","masturbat","horny","milf","dildo","orgasm","genital","naked","nsfw","stripper","prostitute","escort","fetish","bondage","cum","creampie","blowjob","handjob","rimjob","anal","oral","threesom","gangbang","bukkake","rule34","hentai","ecchi","loli","shota","furry","yiff","vore","guro","rape","molest","pedophile","paedophile","cp","childporn","groom","undress","topless","bottomless","upskirt","panties","lingerie","thong","cleavage","nipple","areola"];
const HATE_ROOTS = ["nigger","nigga","nig","faggot","fag","tranny","traps","retard","retarded","chink","spic","kike","dyke","gook","wetback","coon","cracker","honky","wop","kraut","paki","raghead","towelhead","sandnigger","cameljockey","jap","slope","gypsy","pikey","mick","polack","welfarequeen","ghetto","thug","illegal","deport","genocide","ethnic","cleansing","supremacist","nazi","neo-nazi","hitler","gestapo","ss","kkk","aryan","whitepower"];
const THREAT_VIOLENCE_ROOTS = ["kill","murder","assassin","behead","decapitate","massacre","shoot","stab","slaughter","bomb","terroris","terrorism","execute","lynch","torture","mutilate","dismember","burn","hang","poison","sniper","schoolshooter","massshoot","active shooter","death threat","killall","rapemurder","hunting","target","hitlist","manifesto","incite","riot"];
const SCAM_ROOTS = ["freecoins","freerobux","freemoney","freexp","freestuff","freegift","freerobux","freecash","freedownload","crack","pirated","modmenu","hack","hacker","cheat","cheats","scam","phish","malware","ransomware","givemecoins","clickhere","visitmy","subscribe","followme","giveaway","claimer","botaccount","bot","autoclicker","script","exploit","stealer","tokenlog","passwordsteal","credential","sqlinjection","ddos","doxxing"];
const IMPERSONATION_ROOTS = ["admin","administrator","moderator","mod","support","official","staff","developer","dev","owner","founder","ceo","manager","agent","verified","team","helpdesk","security","police","fbi","cia","government","official_"];

function checkCategory(username: string, roots: string[]): string | null {
  const forms = [normalize(username), collapseRepeats(normalize(username)), collapseRepeats(username.toLowerCase().replace(/[\s_.\-]/g, ""))];
  for (const form of forms) { for (const root of roots) { if (form.includes(root)) return "This username does not follow our community guidelines."; } }
  return null;
}

function checkImpersonation(username: string): string | null {
  const lower = username.toLowerCase().replace(/[\s_.\-]/g, "");
  for (const root of IMPERSONATION_ROOTS) {
    if (lower === root || lower === `${root}s` || (lower.startsWith(root) && /^\d+$/.test(lower.slice(root.length)))) {
      return "This username appears to impersonate staff or official accounts. Please choose another one.";
    }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const { username } = await req.json();
    if (!username || typeof username !== "string") return response(false, "Username is required.");
    const trimmed = username.trim();
    if (trimmed.length === 0) return response(false, "Username is required.");
    if (trimmed.length < 2) return response(false, "Username must be at least 2 characters.");
    if (trimmed.length > 20) return response(false, "Username must be 20 characters or fewer.");
    if (!/^[a-zA-Z0-9 _-]+$/.test(trimmed)) return response(false, "This username does not follow our community guidelines.");
    if (/^[0-9 _.-]+$/.test(trimmed)) return response(false, "This username does not follow our community guidelines.");

    const checks = [checkCategory(trimmed, PROFANITY_ROOTS), checkCategory(trimmed, SEXUAL_ROOTS), checkCategory(trimmed, HATE_ROOTS), checkCategory(trimmed, THREAT_VIOLENCE_ROOTS), checkCategory(trimmed, SCAM_ROOTS), checkImpersonation(trimmed)];
    for (const result of checks) { if (result) return response(false, result); }

    const stripped = trimmed.replace(/[\s_-]/g, "");
    if (stripped.length > 0) { const unique = new Set(stripped.toLowerCase()).size; if (unique === 1 && stripped.length > 3) return response(false, "This username does not follow our community guidelines."); }

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: existing } = await supabase.from("profiles").select("id").ilike("username", trimmed).limit(1);
    if (existing && existing.length > 0) return response(false, "This username is already taken. Please choose another one.");

    return response(true);
  } catch {
    return new Response(JSON.stringify({ ok: false, approved: false, reason: "Moderation check failed. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function response(approved: boolean, reason?: string): Response {
  return new Response(JSON.stringify({ ok: true, approved, reason: approved ? undefined : reason }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
