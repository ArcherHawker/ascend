import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { LevelUpOverlay, type LevelUpData } from "@/components/LevelUpOverlay";
import { AchievementOverlay, type AchievementData } from "@/components/AchievementOverlay";
import { DailyCheckIn, MoodBadge } from "@/components/DailyCheckIn";
import { WeeklyRecap } from "@/components/WeeklyRecap";
import { AICoach } from "@/components/AICoach";
import { SmartNotifications } from "@/components/SmartNotifications";
import { useAscend, completeQuest, replaceQuest, removeQuest, levelFromXp, onLevelUp, onAchievementUnlocked, DIFFICULTY_META, type Difficulty } from "@/lib/ascend-store";
import { useAuth } from "@/lib/auth-context";
import { sounds } from "@/lib/sounds";

export const Route = createFileRoute("/home")({ component: Home });

const QUOTES = ["Discipline is choosing between what you want now and what you want most.", "Small steps. Every day.", "You are the sum of your habits.", "Show up. Especially when you don't feel like it."];

function Home() {
  const state = useAscend();
  const auth = useAuth();
  const navigate = useNavigate();
  const [xpFloat, setXpFloat] = useState<{ id: number; amount: number } | null>(null);
  const [levelUp, setLevelUp] = useState<LevelUpData | null>(null);
  const [achievement, setAchievement] = useState<AchievementData | null>(null);

  useEffect(() => {
    if (!auth.loading && !auth.session) navigate({ to: "/", replace: true });
    else if (auth.session && !state.onboarded) navigate({ to: "/onboarding", replace: true });
  }, [auth.loading, auth.session, state.onboarded, navigate]);

  useEffect(() => {
    return onLevelUp((level, reward) => {
      sounds.levelUp();
      setLevelUp({ level, reward: reward?.name ?? "Level Up!", rewardIcon: reward?.icon ?? "✨" });
    });
  }, []);

  useEffect(() => {
    return onAchievementUnlocked((a) => {
      sounds.achievement();
      setAchievement(a);
    });
  }, []);

  const { level, progress, xpForNext, xpInLevel } = levelFromXp(state.xp);
  const doneCount = state.dailyQuests.filter((q) => q.done).length;
  const pct = state.dailyQuests.length ? Math.round((doneCount / state.dailyQuests.length) * 100) : 0;
  const quote = QUOTES[new Date().getDate() % QUOTES.length];
  const handleComplete = (id: string, xp: number) => { sounds.questComplete(); setTimeout(() => sounds.xpGain(), 200); completeQuest(id); setXpFloat({ id: Date.now(), amount: xp }); setTimeout(() => setXpFloat(null), 1500); };

  return (
    <AppShell>
      <DailyCheckIn />
      <WeeklyRecap />
      {levelUp && <LevelUpOverlay data={levelUp} onDone={() => setLevelUp(null)} />}
      {achievement && <AchievementOverlay data={achievement} onDone={() => setAchievement(null)} />}

      <header className="flex items-center justify-between mb-6 animate-rise-fade">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-full bg-linear-to-tr from-violet-glow to-electric p-[2px]"><div className="size-full rounded-full bg-obsidian grid place-items-center font-display font-extrabold text-xs">LV {level}</div></div>
          <div>
            <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Level {level}</h2>
            <div className="h-1.5 w-32 bg-zinc-800 rounded-full mt-1 overflow-hidden"><div className="h-full bg-linear-to-r from-violet-glow to-electric rounded-full transition-all duration-700" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
            <div className="text-[9px] text-zinc-600 mt-1 tabular-nums">{xpInLevel} / {xpForNext} XP</div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 justify-end"><span className="text-amber-400">🔥</span><span className="font-display font-extrabold text-xl">{state.streak}</span></div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Day Streak</p>
          {state.longestStreak > 0 && <p className="text-[9px] text-zinc-600 mt-0.5">Best: {state.longestStreak} days</p>}
          {state.freezeTokens > 0 && <p className="text-[9px] text-sky-400 mt-0.5">❄️ {state.freezeTokens} freeze</p>}
          {state.coins > 0 && <p className="text-[9px] text-ascend-gold mt-0.5">🪙 {state.coins} coins</p>}
        </div>
      </header>

      {state.moodDate === new Date().toISOString().slice(0, 10) && (
        <div className="mb-4 animate-rise-fade"><MoodBadge /></div>
      )}

      <AICoach />

      <SmartNotifications />

      <section className="relative mb-8 py-6 flex flex-col items-center justify-center animate-ascend-in">
        <div className="absolute size-48 border border-white/5 rounded-full animate-pulse-ring" />
        <div className="absolute size-64 border border-white/5 rounded-full opacity-40" />
        <div className="absolute size-56 bg-gradient-to-tr from-ascend-violet/20 via-ascend-fuchsia/20 to-ascend-gold/20 rounded-full blur-2xl" />
        <div className="text-center z-10">
          <span className="text-[10px] font-black text-ascend-gold uppercase tracking-[0.3em] mb-2 block">Life Score</span>
          <div className="text-8xl font-display font-black tracking-tighter text-white drop-shadow-[0_0_35px_rgba(167,139,250,0.5)] tabular-nums">{Math.round(state.strideScore)}</div>
          <span className="px-3 py-1 bg-gradient-to-r from-ascend-violet/20 to-ascend-gold/20 text-ascend-gold border border-ascend-gold/30 rounded-full text-[10px] font-black mt-4 inline-block uppercase tracking-[0.25em]">{state.tier || "Rising"}</span>
        </div>
        {xpFloat && <div key={xpFloat.id} className="absolute top-1/2 pointer-events-none font-display font-black text-3xl animate-xp-float bg-gradient-to-r from-ascend-violet to-ascend-gold bg-clip-text text-transparent">+{xpFloat.amount} XP</div>}
      </section>

      <section className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-card border border-white/5 rounded-2xl p-4 flex items-center gap-3">
          <div className="relative size-14 shrink-0">
            <svg viewBox="0 0 36 36" className="size-14 -rotate-90"><circle cx="18" cy="18" r="15" fill="none" stroke="#27272a" strokeWidth="3" /><circle cx="18" cy="18" r="15" fill="none" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 94.2} 94.2`} className="transition-all duration-700" /></svg>
            <div className="absolute inset-0 grid place-items-center font-display font-extrabold text-sm">{pct}%</div>
          </div>
          <div><div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Today</div><div className="text-sm font-semibold">{doneCount}/{state.dailyQuests.length} quests</div></div>
        </div>
        <div className="bg-card border border-white/5 rounded-2xl p-4 flex items-center"><p className="text-xs text-zinc-400 italic leading-snug">&ldquo;{quote}&rdquo;</p></div>
      </section>

      <section className="space-y-3 mb-8">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-extrabold">Daily Quests</h3>
          <span className="text-xs text-zinc-500">{pct}% Complete</span>
        </div>
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-gradient-to-r from-ascend-violet to-ascend-gold rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        {state.dailyQuests.map((q) => {
          const diff = q.difficulty ? DIFFICULTY_META[q.difficulty as Difficulty] : null;
          return (
            <div key={q.id} className="group bg-card border border-white/5 p-4 rounded-2xl flex items-center justify-between transition-all hover:bg-zinc-800/50 hover:border-white/10">
              <div className="flex items-center gap-4 min-w-0">
                <div className="size-11 bg-zinc-900 rounded-xl grid place-items-center border border-white/5 text-lg shrink-0">{q.icon}</div>
                <div className="min-w-0">
                  <p className={`font-semibold text-sm ${q.done ? "line-through text-zinc-500" : ""}`}>{q.title}</p>
                  <p className="text-xs text-zinc-500 truncate">{q.subtitle} · +{q.xp} XP</p>
                  {diff && <span className={`inline-block text-[9px] font-bold uppercase tracking-wider mt-1 ${diff.color}`}>{"★".repeat(diff.stars)} {diff.label}</span>}
                </div>
              </div>
              {q.done ? (
                <div className="size-7 rounded-full bg-violet-glow grid place-items-center text-xs text-white shrink-0">✓</div>
              ) : (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => { sounds.buttonPress(); replaceQuest(q.id); }} aria-label="Replace" className="size-7 rounded-full border border-white/10 text-zinc-500 grid place-items-center text-xs active:scale-90 transition-transform">↻</button>
                  <button onClick={() => handleComplete(q.id, q.xp)} aria-label="Complete" className="size-7 rounded-full border-2 border-zinc-700 hover:border-violet-glow active:scale-90 transition-all" />
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="mb-6">
        <div className="bg-linear-to-br from-violet-glow to-electric p-6 rounded-3xl relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 size-40 bg-white/10 rounded-full blur-2xl" />
          <div className="relative z-10">
            <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest bg-white/15 px-2 py-1 rounded mb-4 inline-block">Featured Adventure</span>
            <h3 className="text-2xl font-display font-extrabold text-white mb-2 leading-tight">Watch Tomorrow&apos;s Sunrise</h3>
            <p className="text-white/80 text-sm mb-5 max-w-[240px]">Find a quiet spot outdoors and document the start of your day. +100 XP</p>
            <button onClick={() => { sounds.pageTransition(); navigate({ to: "/explore" }); }} className="w-full bg-white text-obsidian font-bold py-3 rounded-xl transition-transform active:scale-95">Explore Adventures</button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
