import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { checkUsername, checkUsernameAI, USERNAME_GUIDELINE_MESSAGE } from "@/lib/moderation";
import { useTheme } from "@/lib/theme";
import { sounds, isSoundEnabled, setSoundEnabled } from "@/lib/sounds";
import { useAscend, resetAll } from "@/lib/ascend-store";
import { useNotificationPrefs, updatePref, resetDismissed, type NotificationPref } from "@/lib/notifications";

export const Route = createFileRoute("/settings")({ component: Settings });

type Section = "account" | "privacy" | "notifications" | "theme" | "data" | "about";

const SECTIONS: { key: Section; label: string; icon: string; desc: string }[] = [
  { key: "account", label: "Account", icon: "👤", desc: "Name, username, date of birth" },
  { key: "notifications", label: "Notifications", icon: "🔔", desc: "Quest reminders, streaks, level alerts" },
  { key: "theme", label: "Appearance", icon: "🎨", desc: "Theme and sound effects" },
  { key: "privacy", label: "Privacy", icon: "🔒", desc: "Profile visibility and data" },
  { key: "data", label: "Data & Storage", icon: "💾", desc: "Export your data, delete account" },
  { key: "about", label: "About Stride", icon: "ℹ️", desc: "Version and credits" },
];

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={"w-12 h-7 rounded-full p-1 transition-colors shrink-0 " + (on ? "bg-ascend-violet" : "bg-zinc-700")}>
      <div className={"size-5 rounded-full bg-white transition-transform " + (on ? "translate-x-5" : "")} />
    </button>
  );
}

function Row({ label, value, onClick, chevron }: { label: string; value?: string; onClick?: () => void; chevron?: boolean }) {
  return (
    <button onClick={onClick} disabled={!onClick} className="w-full flex items-center justify-between py-3.5 px-4 text-left active:bg-white/[0.02] transition-colors disabled:cursor-default">
      <span className="text-sm text-zinc-200">{label}</span>
      <div className="flex items-center gap-2">
        {value && <span className="text-sm text-zinc-500 max-w-[160px] truncate">{value}</span>}
        {chevron && <span className="text-zinc-600 text-xs">›</span>}
      </div>
    </button>
  );
}

function GroupCard({ children }: { children: React.ReactNode }) {
  return <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">{children}</div>;
}

function Settings() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const ascend = useAscend();
  const notifPrefs = useNotificationPrefs();
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [activeSection, setActiveSection] = useState<Section | null>(null);

  // Account form state
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [dob, setDob] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [originalDob, setOriginalDob] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Privacy state
  const [profileVisible, setProfileVisible] = useState(true);
  const [leaderboardVisible, setLeaderboardVisible] = useState(true);
  const [shareStats, setShareStats] = useState(true);
  const [privacySaving, setPrivacySaving] = useState(false);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Sign out confirmation
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (auth.profile) {
      setDisplayName(auth.profile.display_name ?? "");
      setUsername(auth.profile.username);
      setOriginalUsername(auth.profile.username);
      const dobValue = auth.profile.date_of_birth ?? "";
      setDob(dobValue);
      setOriginalDob(dobValue);
      setProfileVisible(auth.profile.public_profile ?? true);
      setLeaderboardVisible(auth.profile.leaderboard_visible ?? true);
      setShareStats(auth.profile.share_stats_with_friends ?? true);
    }
  }, [auth.profile]);

  const handlePrivacyChange = async (key: "public_profile" | "leaderboard_visible" | "share_stats_with_friends", value: boolean) => {
    setPrivacySaving(true);
    await supabase.from("profiles").update({ [key]: value }).eq("id", auth.user?.id ?? "");
    await auth.refreshProfile();
    setPrivacySaving(false);
  };

  const validateUsername = (value: string) => {
    setUsername(value);
    setUsernameError(null);
    setUsernameStatus("idle");
    if (!value.trim()) return;
    if (value === originalUsername) return;
    const localCheck = checkUsername(value);
    if (!localCheck.ok) { setUsernameError(localCheck.reason ?? USERNAME_GUIDELINE_MESSAGE); setUsernameStatus("invalid"); return; }
  };

  const checkAvailability = async () => {
    if (!username.trim() || username === originalUsername) return;
    const localCheck = checkUsername(username);
    if (!localCheck.ok) { setUsernameError(localCheck.reason ?? USERNAME_GUIDELINE_MESSAGE); setUsernameStatus("invalid"); return; }
    setUsernameStatus("checking");
    try {
      const { data } = await supabase.from("profiles").select("id").ilike("username", username.trim()).limit(1);
      if (data && data.length > 0) { setUsernameStatus("taken"); setUsernameError("That username is already taken."); }
      else { setUsernameStatus("available"); setUsernameError(null); }
    } catch { setUsernameStatus("idle"); }
  };

  const getAge = (dateStr: string): number | null => {
    if (!dateStr) return null;
    const birth = new Date(dateStr);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleSave = async () => {
    setError(null);
    setSavedMsg(false);
    if (displayName.trim().length > 30) { setDisplayNameError("Display name must be 30 characters or fewer."); return; }
    setDisplayNameError(null);
    if (dob !== originalDob) {
      const age = getAge(dob);
      if (age === null) { setError("Please enter a valid date of birth."); return; }
      if (age < 13) { setError("You must be at least 13 years old."); return; }
    }

    let usernameToSave: string | null = null;
    if (username.trim() !== originalUsername) {
      const localCheck = checkUsername(username);
      if (!localCheck.ok) { setUsernameError(localCheck.reason ?? USERNAME_GUIDELINE_MESSAGE); setUsernameStatus("invalid"); return; }
      setSaving(true);
      const aiCheck = await checkUsernameAI(username);
      if (!aiCheck.approved) { setUsernameError(aiCheck.reason ?? USERNAME_GUIDELINE_MESSAGE); setUsernameStatus("invalid"); setSaving(false); return; }
      const { data } = await supabase.from("profiles").select("id").ilike("username", username.trim()).limit(1);
      if (data && data.length > 0) { setUsernameStatus("taken"); setUsernameError("That username is already taken."); setSaving(false); return; }
      usernameToSave = username.trim();
    }

    setSaving(true);
    const updates: Record<string, string | null> = {};
    if (displayName.trim() !== (auth.profile?.display_name ?? "")) updates.display_name = displayName.trim() || null;
    if (usernameToSave) updates.username = usernameToSave;
    if (dob !== originalDob) updates.date_of_birth = dob || null;

    if (Object.keys(updates).length === 0) {
      setSaving(false); setSavedMsg(true); setTimeout(() => setSavedMsg(false), 2000); return;
    }

    const { error: updateError } = await supabase.from("profiles").update(updates).eq("id", auth.user?.id ?? "");
    setSaving(false);

    if (updateError) {
      if (updateError.message.includes("duplicate")) { setUsernameError("That username is already taken."); setUsernameStatus("taken"); }
      else setError("Could not save changes. Please try again.");
      return;
    }

    await auth.refreshProfile();
    setOriginalUsername(username.trim());
    setOriginalDob(dob);
    setUsernameStatus("idle");
    setUsernameError(null);
    setSavedMsg(true);
    sounds.questComplete();
    setTimeout(() => setSavedMsg(false), 2500);
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const exportData = {
        profile: auth.profile,
        gameState: {
          xp: ascend.xp,
          strideScore: ascend.strideScore,
          tier: ascend.tier,
          stats: ascend.stats,
          streak: ascend.streak,
          longestStreak: ascend.longestStreak,
          completedCount: ascend.completedCount,
          achievements: ascend.achievements,
          journal: ascend.journal,
          adventures: ascend.adventures,
          coins: ascend.coins,
          ownedItems: ascend.ownedItems,
          mood: ascend.mood,
        },
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stride-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      sounds.buttonPress();
    } catch {
      setError("Could not export data. Please try again.");
    }
    setExporting(false);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`;
      const response = await fetch(apiUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${auth.session?.access_token ?? ""}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to delete account.");
      }
      await supabase.auth.signOut();
      resetAll();
      navigate({ to: "/auth", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete account.");
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
    }
  };

  if (!auth.session) { navigate({ to: "/auth", replace: true }); return null; }

  // ─── Detail views ───
  if (activeSection === "account") {
    return (
      <AppShell>
        <header className="mb-6 animate-rise-fade">
          <button onClick={() => { setActiveSection(null); sounds.buttonPress(); }} className="flex items-center gap-2 text-sm text-ascend-violet mb-3 active:scale-95 transition-transform">
            <span>‹</span><span className="font-bold">Settings</span>
          </button>
          <h1 className="font-display text-2xl font-black tracking-tighter">Account</h1>
        </header>

        <div className="space-y-5 animate-rise-fade">
          <GroupCard>
            <div className="p-4">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Display Name</label>
              <input value={displayName} onChange={(e) => { setDisplayName(e.target.value); setDisplayNameError(null); }} placeholder="Name shown on your profile" maxLength={30} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-ascend-violet transition-colors" />
              {displayNameError && <p className="mt-1.5 text-xs text-red-400 font-medium">{displayNameError}</p>}
            </div>
            <div className="p-4">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Username</label>
              <div className="flex gap-2">
                <input value={username} onChange={(e) => validateUsername(e.target.value)} onBlur={checkAvailability} placeholder="Your unique handle" maxLength={20} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-ascend-violet transition-colors" />
                {usernameStatus === "checking" && <span className="self-center text-xs text-zinc-500 animate-pulse">…</span>}
                {usernameStatus === "available" && <span className="self-center text-xs text-emerald-400 font-bold">✓</span>}
                {usernameStatus === "taken" && <span className="self-center text-xs text-red-400 font-bold">✗</span>}
              </div>
              {usernameError && <p className="mt-1.5 text-xs text-red-400 font-medium">{usernameError}</p>}
            </div>
            <div className="p-4">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Date of Birth</label>
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().slice(0, 10)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-ascend-violet transition-colors" />
            </div>
          </GroupCard>

          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>}
          {savedMsg && <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-400 font-medium">Changes saved successfully.</div>}

          <button onClick={handleSave} disabled={saving} className="w-full bg-gradient-to-r from-ascend-violet to-ascend-fuchsia text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-transform disabled:opacity-50">{saving ? "Saving…" : "Save Changes"}</button>

          <GroupCard>
            <Row label="Email" value={auth.user?.email} />
            <Row label="Member since" value={auth.profile?.created_at ? new Date(auth.profile.created_at).toLocaleDateString() : "—"} />
            <Row label="Role" value={(auth.profile?.role ?? "user").charAt(0).toUpperCase() + (auth.profile?.role ?? "user").slice(1)} />
          </GroupCard>
        </div>
      </AppShell>
    );
  }

  if (activeSection === "notifications") {
    const notifRows: { key: keyof NotificationPref; label: string; desc: string }[] = [
      { key: "questReminders", label: "Quest Reminders", desc: "Get notified when quests are waiting" },
      { key: "streakAlerts", label: "Streak Alerts", desc: "Warnings when your streak is at risk" },
      { key: "levelUpAlerts", label: "Level Up Alerts", desc: "Know when you're close to leveling up" },
      { key: "weeklyRecap", label: "Weekly Recap", desc: "Sunday summary of your week" },
      { key: "achievementAlerts", label: "Achievement Alerts", desc: "Celebrate new achievements" },
    ];
    return (
      <AppShell>
        <header className="mb-6 animate-rise-fade">
          <button onClick={() => { setActiveSection(null); sounds.buttonPress(); }} className="flex items-center gap-2 text-sm text-ascend-violet mb-3 active:scale-95 transition-transform">
            <span>‹</span><span className="font-bold">Settings</span>
          </button>
          <h1 className="font-display text-2xl font-black tracking-tighter">Notifications</h1>
          <p className="text-sm text-zinc-500 mt-1">Smart, not annoying. You control what matters.</p>
        </header>

        <div className="space-y-4 animate-rise-fade">
          <GroupCard>
            {notifRows.map((row) => (
              <div key={row.key} className="flex items-center justify-between py-3.5 px-4">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-sm text-zinc-200">{row.label}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{row.desc}</p>
                </div>
                <Toggle on={notifPrefs[row.key]} onClick={() => { updatePref(row.key, !notifPrefs[row.key]); sounds.buttonPress(); }} />
              </div>
            ))}
          </GroupCard>

          <button onClick={() => { resetDismissed(); sounds.buttonPress(); }} className="w-full text-sm text-ascend-violet font-bold py-3 active:scale-95 transition-transform">
            Reset dismissed notifications
          </button>
        </div>
      </AppShell>
    );
  }

  if (activeSection === "theme") {
    return (
      <AppShell>
        <header className="mb-6 animate-rise-fade">
          <button onClick={() => { setActiveSection(null); sounds.buttonPress(); }} className="flex items-center gap-2 text-sm text-ascend-violet mb-3 active:scale-95 transition-transform">
            <span>‹</span><span className="font-bold">Settings</span>
          </button>
          <h1 className="font-display text-2xl font-black tracking-tighter">Appearance</h1>
        </header>

        <div className="space-y-6 animate-rise-fade">
          <div>
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Theme</h2>
            <div className="grid grid-cols-2 gap-3">
              {(["dark", "light"] as const).map((t) => {
                const active = theme === t;
                const isDark = t === "dark";
                return (
                  <button key={t} onClick={() => { setTheme(t); sounds.buttonPress(); }} className={`relative rounded-2xl p-4 border-2 transition-all active:scale-95 ${active ? "border-ascend-violet" : "border-white/5"}`} style={{ background: isDark ? "#0f0a1f" : "#f8faff" }}>
                    <div className={`h-20 rounded-xl mb-3 ${isDark ? "bg-gradient-to-br from-violet-900/40 to-fuchsia-900/30" : "bg-gradient-to-br from-sky-100 to-violet-100"}`}>
                      <div className="h-full rounded-xl flex items-center justify-center text-2xl">{isDark ? "🌙" : "☀️"}</div>
                    </div>
                    <div className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-800"}`}>{isDark ? "Dark" : "Light"}</div>
                    <div className={`text-[10px] mt-0.5 ${isDark ? "text-zinc-500" : "text-slate-400"}`}>{isDark ? "Gaming aesthetic" : "Heaven feel"}</div>
                    {active && <div className="absolute top-3 right-3 size-5 rounded-full bg-ascend-violet grid place-items-center text-[10px] text-white">✓</div>}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Sound Effects</h2>
            <GroupCard>
              <div className="flex items-center justify-between py-3.5 px-4">
                <div>
                  <p className="text-sm text-zinc-200">Game Sounds</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Quest complete, XP, level up</p>
                </div>
                <Toggle on={soundOn} onClick={() => { const v = !soundOn; setSoundOn(v); setSoundEnabled(v); if (v) sounds.buttonPress(); }} />
              </div>
            </GroupCard>
          </div>
        </div>
      </AppShell>
    );
  }

  if (activeSection === "privacy") {
    return (
      <AppShell>
        <header className="mb-6 animate-rise-fade">
          <button onClick={() => { setActiveSection(null); sounds.buttonPress(); }} className="flex items-center gap-2 text-sm text-ascend-violet mb-3 active:scale-95 transition-transform">
            <span>‹</span><span className="font-bold">Settings</span>
          </button>
          <h1 className="font-display text-2xl font-black tracking-tighter">Privacy</h1>
          <p className="text-sm text-zinc-500 mt-1">Control who can see your activity.</p>
        </header>

        <div className="space-y-4 animate-rise-fade">
          <GroupCard>
            <div className="flex items-center justify-between py-3.5 px-4">
              <div>
                <p className="text-sm text-zinc-200">Public Profile</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Others can view your profile page</p>
              </div>
              <Toggle on={profileVisible} onClick={() => { const v = !profileVisible; setProfileVisible(v); sounds.buttonPress(); handlePrivacyChange("public_profile", v); }} />
            </div>
            <div className="flex items-center justify-between py-3.5 px-4">
              <div>
                <p className="text-sm text-zinc-200">Leaderboard Visibility</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Show your name on leaderboards</p>
              </div>
              <Toggle on={leaderboardVisible} onClick={() => { const v = !leaderboardVisible; setLeaderboardVisible(v); sounds.buttonPress(); handlePrivacyChange("leaderboard_visible", v); }} />
            </div>
            <div className="flex items-center justify-between py-3.5 px-4">
              <div>
                <p className="text-sm text-zinc-200">Share Stats with Friends</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Friends can see your progress</p>
              </div>
              <Toggle on={shareStats} onClick={() => { const v = !shareStats; setShareStats(v); sounds.buttonPress(); handlePrivacyChange("share_stats_with_friends", v); }} />
            </div>
          </GroupCard>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
            <p className="text-xs text-zinc-500 leading-relaxed">
              Your journal entries and mood check-ins are always private. Only you can see them.
            </p>
          </div>

          {privacySaving && <p className="text-xs text-ascend-violet text-center animate-pulse">Saving...</p>}
        </div>
      </AppShell>
    );
  }

  if (activeSection === "data") {
    return (
      <AppShell>
        <header className="mb-6 animate-rise-fade">
          <button onClick={() => { setActiveSection(null); sounds.buttonPress(); }} className="flex items-center gap-2 text-sm text-ascend-violet mb-3 active:scale-95 transition-transform">
            <span>‹</span><span className="font-bold">Settings</span>
          </button>
          <h1 className="font-display text-2xl font-black tracking-tighter">Data & Storage</h1>
        </header>

        <div className="space-y-5 animate-rise-fade">
          <GroupCard>
            <Row label="Export My Data" chevron onClick={handleExportData} />
            <div className="px-4 pb-3">
              <p className="text-[11px] text-zinc-500">Download a JSON file with your profile, game state, journal, and achievements.</p>
            </div>
          </GroupCard>

          {exporting && <p className="text-xs text-ascend-violet text-center">Preparing your data…</p>}

          <div>
            <h2 className="text-xs font-bold text-red-400/70 uppercase tracking-widest mb-3">Danger Zone</h2>
            <GroupCard>
              <div className="p-4">
                <p className="text-sm font-bold text-red-400 mb-1">Delete Account</p>
                <p className="text-[11px] text-zinc-500 mb-3">Permanently delete your account, all progress, journal entries, and data. This cannot be undone.</p>
                <button onClick={() => setShowDeleteConfirm(true)} className="w-full bg-red-500/10 border border-red-500/30 text-red-400 font-bold py-3 rounded-xl active:scale-95 transition-transform">
                  Delete My Account
                </button>
              </div>
            </GroupCard>
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>}
        </div>

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-nebula border border-red-500/20 rounded-3xl p-6">
              <div className="text-center mb-5">
                <div className="size-14 mx-auto rounded-full bg-red-500/15 grid place-items-center text-2xl mb-3">⚠️</div>
                <h2 className="font-display text-lg font-black">Delete Account?</h2>
                <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                  This permanently erases everything — your profile, progress, journal, coins, and achievements. Type <span className="font-bold text-red-400">DELETE</span> to confirm.
                </p>
              </div>
              <input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="Type DELETE" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-center uppercase placeholder:text-zinc-600 focus:outline-none focus:border-red-500/50 transition-colors mb-4" />
              <div className="flex gap-3">
                <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); sounds.buttonPress(); }} className="flex-1 bg-white/5 border border-white/10 text-zinc-300 font-bold py-3 rounded-xl active:scale-95 transition-transform">Cancel</button>
                <button onClick={handleDeleteAccount} disabled={deleteConfirmText !== "DELETE" || deleting} className="flex-1 bg-red-500/20 border border-red-500/40 text-red-400 font-bold py-3 rounded-xl active:scale-95 transition-transform disabled:opacity-30 disabled:cursor-not-allowed">{deleting ? "Deleting…" : "Delete"}</button>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    );
  }

  if (activeSection === "about") {
    return (
      <AppShell>
        <header className="mb-6 animate-rise-fade">
          <button onClick={() => { setActiveSection(null); sounds.buttonPress(); }} className="flex items-center gap-2 text-sm text-ascend-violet mb-3 active:scale-95 transition-transform">
            <span>‹</span><span className="font-bold">Settings</span>
          </button>
          <h1 className="font-display text-2xl font-black tracking-tighter">About Stride</h1>
        </header>

        <div className="space-y-5 animate-rise-fade">
          <div className="text-center py-6">
            <div className="size-20 mx-auto rounded-3xl bg-gradient-to-tr from-ascend-violet to-ascend-gold grid place-items-center text-4xl mb-4 shadow-lg shadow-ascend-violet/20">🏔️</div>
            <h2 className="font-display text-xl font-black">Stride</h2>
            <p className="text-xs text-zinc-500 mt-1">Level up your life, one quest at a time.</p>
          </div>

          <GroupCard>
            <Row label="Version" value="1.0.0" />
            <Row label="Build" value="2026.08.03" />
            <Row label="Platform" value="Web" />
          </GroupCard>

          <GroupCard>
            <Row label="What's Stride?" />
            <div className="px-4 pb-4">
              <p className="text-xs text-zinc-500 leading-relaxed">
                Stride turns your personal growth into an RPG. Complete daily quests, build streaks, earn XP, and level up your real-life stats — all backed by an AI coach that knows your progress and pushes you forward.
              </p>
            </div>
          </GroupCard>

          <GroupCard>
            <Row label="Privacy First" />
            <div className="px-4 pb-4">
              <p className="text-xs text-zinc-500 leading-relaxed">
                Your data is encrypted and stored securely. Your journal and mood check-ins are always private. You can export or delete your data at any time.
              </p>
            </div>
          </GroupCard>

          <p className="text-center text-[10px] uppercase tracking-[0.3em] text-zinc-700 pt-4">Made with care</p>
        </div>
      </AppShell>
    );
  }

  // ─── Main settings list ───
  return (
    <AppShell>
      <header className="mb-6 animate-rise-fade">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate({ to: "/profile" })} className="size-9 rounded-full bg-white/5 border border-white/10 grid place-items-center text-zinc-400 text-sm active:scale-90 transition-transform">←</button>
          <h1 className="font-display text-2xl font-black tracking-tighter">Settings</h1>
        </div>
      </header>

      <div className="space-y-2 animate-rise-fade">
        {SECTIONS.map((section) => (
          <button key={section.key} onClick={() => { setActiveSection(section.key); sounds.buttonPress(); }} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform text-left">
            <div className="size-10 rounded-xl bg-black/30 grid place-items-center text-lg shrink-0">{section.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-100">{section.label}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{section.desc}</p>
            </div>
            <span className="text-zinc-600 text-xs shrink-0">›</span>
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-2">
        <button onClick={() => { sounds.buttonPress(); setShowSignOutConfirm(true); }} className="w-full text-sm text-red-400/80 font-bold py-3 active:scale-95 transition-transform">
          Sign Out
        </button>
        <button onClick={() => { sounds.buttonPress(); setShowSignOutConfirm(true); }} className="w-full text-sm text-zinc-400 font-bold py-3 active:scale-95 transition-transform">
          Change Account
        </button>
      </div>

      <p className="mt-6 text-center text-[10px] uppercase tracking-[0.3em] text-zinc-700">Stride v1.0.0</p>

      {/* Sign out confirmation */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => !signingOut && setShowSignOutConfirm(false)}>
          <div className="w-full max-w-sm bg-nebula border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 animate-rise-fade" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="size-14 rounded-full bg-red-500/15 border border-red-500/25 grid place-items-center text-2xl mx-auto mb-3">🚪</div>
              <h3 className="font-display text-lg font-black mb-1">Sign out?</h3>
              <p className="text-sm text-zinc-500">You&apos;ll need to sign back in to continue your journey. Your progress is saved.</p>
            </div>
            <div className="space-y-2">
              <button
                onClick={async () => { setSigningOut(true); await supabase.auth.signOut(); resetAll(); setSigningOut(false); setShowSignOutConfirm(false); navigate({ to: "/auth", replace: true }); }}
                disabled={signingOut}
                className="w-full bg-red-500/20 border border-red-500/30 text-red-400 font-bold py-3 rounded-xl active:scale-95 transition-transform disabled:opacity-50"
              >
                {signingOut ? "Signing out..." : "Yes, sign out"}
              </button>
              <button onClick={() => { sounds.buttonPress(); setShowSignOutConfirm(false); }} disabled={signingOut} className="w-full bg-white/5 border border-white/10 text-zinc-300 font-bold py-3 rounded-xl active:scale-95 transition-transform disabled:opacity-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
