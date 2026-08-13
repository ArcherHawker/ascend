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

const QUICK_ROOTS = [
  "fuck","shit","bitch","ass","dick","pussy","cock","cunt","whore","slut",
  "porn","xxx","nude","sex","rape","molest","pedophile","cp","loli","hentai",
  "nigger","nigga","faggot","fag","retard","chink","spic","kike","nazi","kkk",
  "kill","murder","terrorist","bomb","behead","massacre","genocide",
  "freecoins","freemoney","hack","cheat","scam","bot",
  "admin","moderator","official","support","staff","owner",
];

export type UsernameCheck = { ok: boolean; reason?: string; };

export function checkUsername(raw: string): UsernameCheck {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, reason: "Username is required." };
  if (trimmed.length < 2) return { ok: false, reason: "Username must be at least 2 characters." };
  if (trimmed.length > 20) return { ok: false, reason: "Username must be 20 characters or fewer." };
  if (!/^[a-zA-Z0-9 _-]+$/.test(trimmed)) return { ok: false, reason: "This username does not follow our community guidelines." };
  if (/^[0-9 _.-]+$/.test(trimmed)) return { ok: false, reason: "This username does not follow our community guidelines." };
  const forms = [normalize(trimmed), collapseRepeats(normalize(trimmed)), collapseRepeats(trimmed.toLowerCase().replace(/[\s_.\-]/g, ""))];
  for (const form of forms) { for (const root of QUICK_ROOTS) { if (form.includes(root)) return { ok: false, reason: "This username does not follow our community guidelines." }; } }
  return { ok: true };
}

export const USERNAME_GUIDELINE_MESSAGE = "This username does not follow our community guidelines.";

export async function checkUsernameAI(username: string): Promise<{ approved: boolean; reason?: string }> {
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moderate-username`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
      body: JSON.stringify({ username }),
    });
    if (!response.ok) { const local = checkUsername(username); return { approved: local.ok, reason: local.reason }; }
    const result = await response.json();
    return { approved: result.approved, reason: result.reason };
  } catch {
    const local = checkUsername(username);
    return { approved: local.ok, reason: local.reason };
  }
}
