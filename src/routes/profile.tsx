import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useAscend, resetAll, levelFromXp, setAvatar, STAT_META, ACHIEVEMENTS, TITLES, getUnlockedTitles, getHighestTitle, getNextTitle, SHOP_ITEMS, type StatKey } from "@/lib/ascend-store";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { moderateProfileImage } from "@/lib/image-moderation";
import { sounds } from "@/lib/sounds";
import { GoalsSection } from "@/components/GoalsSection";

export const Route = createFileRoute("/profile")({ component: Profile });

function Profile() {
  const state = useAscend();
  const auth = useAuth();
  const navigate = useNavigate();
  const { level } = levelFromXp(state.xp);
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarModMsg, setAvatarModMsg] = useState<string | null>(null);
  const [avatarRejected, setAvatarRejected] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [bioEditing, setBioEditing] = useState(false);
  const [bioSaving, setBioSaving] = useState(false);

  useEffect(() => {
    if (auth.profile?.bio) setBio(auth.profile.bio);
  }, [auth.profile?.bio]);

  const tierColor = (t: string) => t === "bronze" ? "from-amber-700 to-amber-500" : t === "silver" ? "from-zinc-400 to-zinc-200" : t === "gold" ? "from-yellow-500 to-amber-300" : "from-cyan-400 to-violet-glow";
  const displayName = auth.profile?.display_name || auth.profile?.username || state.name || "Adventurer";
  const username = auth.profile?.username || "adventurer";
  const avatarUrl = auth.profile?.avatar_moderated ? auth.profile?.avatar_url : null;

  const handleFile = async (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setAvatarModMsg("Please pick an image file."); setAvatarRejected(true); return; }
    if (f.size > 4 * 1024 * 1024) { setAvatarModMsg("Image too large (max 4MB). Try a smaller one."); setAvatarRejected(true); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const img = new Image();
      img.onload = async () => {
        const max = 400; const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale); const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d"); if (!ctx) return; ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const modResult = await moderateProfileImage(dataUrl, auth.user?.id ?? "");
        if (!modResult.approved) {
          setAvatarModMsg(modResult.error ?? "Image rejected. Using default profile picture.");
          setAvatarRejected(true); setAvatar(null);
          await supabase.from("profiles").update({ avatar_url: null, avatar_moderated: true }).eq("id", auth.user?.id ?? "");
          auth.refreshProfile(); return;
        }
        setAvatarModMsg(null); setAvatarRejected(false); setAvatar(dataUrl);
        await supabase.from("profiles").update({ avatar_url: dataUrl, avatar_moderated: true }).eq("id", auth.user?.id ?? "");
        auth.refreshProfile();
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(f);
  };

  const handleSaveBio = async () => {
    setBioSaving(true);
    const trimmed = bio.trim().slice(0, 200);
    await supabase.from("profiles").update({ bio: trimmed || null }).eq("id", auth.user?.id ?? "");
    await auth.refreshProfile();
    setBioEditing(false);
    setBioSaving(false);
    sounds.questComplete();
  };

  const handleReset = () => { if (confirm("Reset all local progress? This won't delete your account.")) { resetAll(); navigate({ to: "/onboarding", replace: true }); } };

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    if (deleteConfirm !== "DELETE") { setDeleteError('Type "DELETE" to confirm.'); return; }
    setDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not authenticated.");
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete account.");
      }
      await supabase.auth.signOut();
      resetAll();
      navigate({ to: "/auth", replace: true });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete account.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell>
      <header className="flex flex-col items-center mb-8 animate-rise-fade">
        <button onClick={() => fileRef.current?.click()} className="relative mb-4 group" aria-label="Change profile picture">
          <div className="absolute inset-0 bg-ascend-violet/30 blur-2xl rounded-full" />
          <div className="relative size-24 rounded-full bg-gradient-to-tr from-ascend-violet to-ascend-fuchsia p-[3px]">
            <div className="size-full rounded-full bg-nebula grid place-items-center font-display font-extrabold text-4xl overflow-hidden">{avatarUrl ? <img src={avatarUrl} alt="Profile" className="size-full object-cover" /> : displayName.charAt(0).toUpperCase()}</div>
          </div>
          <div className="absolute -bottom-1 -right-1 size-8 rounded-full bg-ascend-violet border-2 border-obsidian grid place-items-center text-sm shadow-lg group-active:scale-90 transition-transform">📷</div>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { handleFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
        {avatarRejected && avatarModMsg && <p className="mb-2 text-xs text-red-400 font-medium text-center max-w-xs">{avatarModMsg}</p>}
        <h1 className="font-display text-2xl font-extrabold">{displayName}</h1>
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mt-1">@{username}</p>
        <p className="text-xs text-zinc-500 mt-0.5">Level {level} · {state.tier || "Rising"} · {Math.round(state.strideScore)}</p>

        {/* Titles */}
        {(() => {
          const unlocked = getUnlockedTitles(state.xp);
          const highest = getHighestTitle(state.xp);
          if (unlocked.length === 0) return null;
          return (
            <div className="flex flex-wrap gap-1.5 mt-3 justify-center max-w-md">
              {unlocked.slice(-5).map((t) => (
                <span key={t.id} className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${t.id === highest.id ? "bg-ascend-gold/15 border-ascend-gold/30 text-ascend-gold" : "bg-white/5 border-white/10 text-zinc-400"}`}>
                  {t.icon} {t.name}
                </span>
              ))}
            </div>
          );
        })()}

        {/* Bio */}
        <div className="mt-4 max-w-md w-full">
          {bioEditing ? (
            <div className="space-y-2">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 200))}
                placeholder="Share your goals, introduce yourself, show what you're working towards..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-ascend-violet transition-colors resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-600">{bio.length}/200</span>
                <div className="flex gap-2">
                  <button onClick={() => { setBioEditing(false); setBio(auth.profile?.bio ?? ""); sounds.buttonPress(); }} className="text-xs font-bold text-zinc-400 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 active:scale-95 transition-transform">Cancel</button>
                  <button onClick={handleSaveBio} disabled={bioSaving} className="text-xs font-bold text-white px-4 py-1.5 rounded-lg bg-ascend-violet/30 border border-ascend-violet/40 active:scale-95 transition-transform disabled:opacity-50">{bioSaving ? "Saving…" : "Save"}</button>
                </div>
              </div>
            </div>
          ) : bio ? (
            <button onClick={() => { setBioEditing(true); sounds.buttonPress(); }} className="group w-full text-center">
              <p className="text-sm text-zinc-300 leading-relaxed italic">"{bio}"</p>
              <p className="text-[10px] text-zinc-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Tap to edit</p>
            </button>
          ) : (
            <button onClick={() => { setBioEditing(true); sounds.buttonPress(); }} className="text-xs text-ascend-violet/70 font-bold py-1.5 active:scale-95 transition-transform">
              + Add a bio
            </button>
          )}
        </div>

        <div className="flex gap-2 mt-4 flex-wrap justify-center">
          <button onClick={() => navigate({ to: "/timeline" })} className="text-xs font-bold bg-ascend-violet/10 border border-ascend-violet/20 text-ascend-violet px-4 py-2 rounded-lg active:scale-95 transition-transform">📜 Timeline</button>
          <button onClick={() => navigate({ to: "/settings" })} className="text-xs font-bold bg-white/5 border border-white/10 text-zinc-300 px-4 py-2 rounded-lg active:scale-95 transition-transform">⚙ Settings</button>
          <button onClick={() => navigate({ to: "/leaderboard" })} className="text-xs font-bold bg-white/5 border border-white/10 text-zinc-300 px-4 py-2 rounded-lg active:scale-95 transition-transform">🏆 Leaderboard</button>
          <button onClick={() => navigate({ to: "/friends" })} className="text-xs font-bold bg-white/5 border border-white/10 text-zinc-300 px-4 py-2 rounded-lg active:scale-95 transition-transform">👥 Friends</button>
          {auth.isAdmin && <button onClick={() => navigate({ to: "/admin" })} className="text-xs font-bold bg-ascend-gold/10 border border-ascend-gold/30 text-ascend-gold px-4 py-2 rounded-lg active:scale-95 transition-transform">Admin</button>}
        </div>
      </header>
      <section className="grid grid-cols-2 gap-3 mb-6">
        <Stat label="Streak" value={`${state.streak}🔥`} />
        <Stat label="Quests" value={state.completedCount.toString()} />
        <Stat label="XP" value={state.xp.toString()} />
        <Stat label="Life Score" value={Math.round(state.strideScore).toString()} />
      </section>

      {state.coins > 0 && (
        <div className="mb-6 flex items-center justify-between bg-ascend-gold/5 border border-ascend-gold/20 rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🪙</span>
            <span className="text-sm font-bold text-ascend-gold">{state.coins} Coins</span>
          </div>
          <button onClick={() => navigate({ to: "/shop" })} className="text-xs font-bold bg-ascend-gold/15 border border-ascend-gold/30 text-ascend-gold px-4 py-2 rounded-lg active:scale-95 transition-transform">Shop →</button>
        </div>
      )}

      {Object.keys(state.equippedItems).length > 0 && (
        <div className="mb-6">
          <h2 className="font-display text-lg font-extrabold mb-3">Equipped Items</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(state.equippedItems).map(([cat, itemId]) => {
              const item = SHOP_ITEMS.find((i) => i.id === itemId);
              if (!item) return null;
              return (
                <div key={cat} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-xs font-bold text-zinc-300">{item.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <h2 className="font-display text-lg font-extrabold mb-3">Core Stats</h2>
      <div className="grid grid-cols-2 gap-3 mb-8">
        {(Object.keys(STAT_META) as StatKey[]).map((key) => (
          <div key={key} className="bg-card border border-white/5 rounded-xl p-3 flex items-center gap-2.5">
            <span className="text-lg">{STAT_META[key].icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest truncate">{STAT_META[key].label}</span>
                <span className="font-display font-bold text-sm tabular-nums">{Math.round(state.stats[key])}</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-ascend-violet to-ascend-gold rounded-full transition-all duration-700" style={{ width: `${state.stats[key]}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="font-display text-lg font-extrabold mb-3 mt-2">Titles</h2>
      <div className="space-y-2 mb-8">
        {(() => {
          const unlocked = getUnlockedTitles(state.xp);
          const next = getNextTitle(state.xp);
          const highest = getHighestTitle(state.xp);
          const currentLevel = levelFromXp(state.xp).level;
          return (
            <>
              <div className="bg-gradient-to-r from-ascend-violet/20 to-ascend-gold/20 border border-ascend-violet/30 rounded-2xl p-4 flex items-center gap-3">
                <div className="size-12 rounded-xl bg-ascend-violet/30 grid place-items-center text-2xl">{highest.icon}</div>
                <div className="flex-1">
                  <p className="text-sm font-bold">{highest.label}</p>
                  <p className="text-[10px] text-zinc-400">{highest.desc}</p>
                </div>
                <span className="text-[10px] font-bold text-ascend-gold uppercase tracking-widest">Current</span>
              </div>
              {next && (
                <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                  <div className="size-12 rounded-xl bg-white/5 grid place-items-center text-2xl opacity-40">{next.icon}</div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-zinc-400">{next.label}</p>
                    <p className="text-[10px] text-zinc-600">Unlocks at Level {next.minLevel}</p>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Lv {currentLevel}/{next.minLevel}</span>
                </div>
              )}
              <div className="grid grid-cols-5 gap-2">
                {TITLES.map((t) => {
                  const isUnlocked = unlocked.some((u) => u.id === t.id);
                  return (
                    <div key={t.id} className={`aspect-square rounded-xl flex flex-col items-center justify-center text-center border transition-all ${isUnlocked ? "border-ascend-gold/30 bg-ascend-gold/5" : "border-white/5 bg-black/30 opacity-30"}`}>
                      <span className="text-lg">{t.icon}</span>
                      <span className="text-[8px] font-bold leading-tight mt-0.5">{t.label}</span>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}
      </div>

      <h2 className="font-display text-lg font-extrabold mb-3">Achievements</h2>
      <div className="grid grid-cols-3 gap-3 mb-8">
        {ACHIEVEMENTS.map((a) => {
          const unlocked = state.achievements.includes(a.id);
          return (
          <div key={a.id} className={`aspect-square rounded-2xl p-3 flex flex-col items-center justify-center text-center border transition-all ${unlocked ? "border-white/10 bg-card" : "border-white/5 bg-black/30 opacity-40"}`}>
            <div className={`size-10 rounded-full bg-linear-to-br ${tierColor(a.tier)} grid place-items-center text-lg mb-2 ${!unlocked ? "grayscale" : ""}`}>{a.icon}</div>
            <div className="text-[10px] font-bold leading-tight">{a.label}</div>
            <div className="text-[8px] text-zinc-600 mt-0.5 leading-tight">{a.desc}</div>
          </div>
          );
        })}
      </div>
      <div className="mb-8">
        <GoalsSection />
      </div>
      <h2 className="font-display text-lg font-extrabold mb-3">Interests</h2>
      <div className="flex flex-wrap gap-2 mb-10">
        {state.interests.length === 0 && <span className="text-zinc-500 text-xs">None set</span>}
        {state.interests.map((i) => <span key={i} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-zinc-300">{i}</span>)}
      </div>
      <div className="space-y-3">
        <button onClick={() => navigate({ to: "/settings" })} className="w-full border border-white/10 bg-white/5 text-zinc-300 font-semibold py-3 rounded-xl text-sm active:scale-95 transition-transform">⚙ Settings</button>
        <button onClick={handleReset} className="w-full border border-white/10 bg-white/5 text-zinc-400 font-semibold py-3 rounded-xl text-sm active:scale-95 transition-transform">Reset progress</button>
      </div>

      <div className="mt-8 pt-6 border-t border-red-500/10">
        <h2 className="text-xs font-bold text-red-400/70 uppercase tracking-widest mb-3">Danger Zone</h2>
        {!deleteOpen ? (
          <button onClick={() => setDeleteOpen(true)} className="w-full border border-red-500/20 bg-red-500/5 text-red-400 font-semibold py-3 rounded-xl text-sm active:scale-95 transition-transform">Delete Account</button>
        ) : (
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 space-y-3">
            <p className="text-sm text-red-300/90 leading-relaxed">This permanently deletes your account, profile, and all data. This cannot be undone.</p>
            <div>
              <label className="block text-xs font-bold text-red-400/60 uppercase tracking-widest mb-2">Type DELETE to confirm</label>
              <input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" className="w-full bg-white/5 border border-red-500/20 rounded-xl px-4 py-3 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-red-500/50 transition-colors" />
            </div>
            {deleteError && <p className="text-xs text-red-400 font-medium">{deleteError}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setDeleteOpen(false); setDeleteConfirm(""); setDeleteError(null); }} className="flex-1 border border-white/10 bg-white/5 text-zinc-300 font-semibold py-3 rounded-xl text-sm active:scale-95 transition-transform">Cancel</button>
              <button onClick={handleDeleteAccount} disabled={deleting} className="flex-1 bg-red-500/90 text-white font-bold py-3 rounded-xl text-sm active:scale-95 transition-transform disabled:opacity-50">{deleting ? "Deleting…" : "Delete Forever"}</button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-[10px] uppercase tracking-[0.3em] text-zinc-700">Ascend v0.1 Beta</p>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="bg-card border border-white/5 rounded-2xl p-4 text-center"><div className="font-display font-extrabold text-2xl">{value}</div><div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1 font-bold">{label}</div></div>;
}
