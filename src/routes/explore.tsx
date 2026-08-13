import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAscend, generateRandomQuest, generateSideQuest, addSideQuest, DIFFICULTY_META, type Difficulty, type StatKey } from "@/lib/ascend-store";

export const Route = createFileRoute("/explore")({ component: Explore });

type Item = { title: string; icon: string; xp: number; stat: StatKey; subtitle: string; difficulty: Difficulty };

const SIDE_QUESTS: Item[] = [
  { title: "Watch Sunrise", icon: "🌅", xp: 100, stat: "discipline", subtitle: "Be up before the sun", difficulty: "hard" },
  { title: "Visit a New Park", icon: "🌳", xp: 60, stat: "athleticism", subtitle: "Somewhere unfamiliar", difficulty: "medium" },
  { title: "Take 10 Photos", icon: "📷", xp: 40, stat: "creativity", subtitle: "Frame what others miss", difficulty: "easy" },
  { title: "Ride 10km", icon: "🚴", xp: 80, stat: "athleticism", subtitle: "Any bike, any route", difficulty: "hard" },
  { title: "Finish a Book", icon: "📚", xp: 150, stat: "intelligence", subtitle: "Last chapter counts", difficulty: "extreme" },
  { title: "Cook Dinner", icon: "🍳", xp: 50, stat: "creativity", subtitle: "From scratch", difficulty: "medium" },
  { title: "50 Free Kicks", icon: "⚽", xp: 45, stat: "athleticism", subtitle: "Weak foot only", difficulty: "medium" },
  { title: "Talk to a Stranger", icon: "🎤", xp: 60, stat: "social", subtitle: "One real conversation", difficulty: "medium" },
  { title: "Watch the Sunset", icon: "🌇", xp: 40, stat: "discipline", subtitle: "Phone stays in pocket", difficulty: "easy" },
  { title: "Try a New Café", icon: "☕", xp: 35, stat: "social", subtitle: "One you've never been to", difficulty: "easy" },
  { title: "Learn 5 Words", icon: "🗣️", xp: 30, stat: "intelligence", subtitle: "In a new language", difficulty: "easy" },
  { title: "Compliment 3 People", icon: "💬", xp: 40, stat: "social", subtitle: "Mean every one", difficulty: "easy" },
  { title: "100 Pushups", icon: "🔥", xp: 80, stat: "strength", subtitle: "Split across the day", difficulty: "hard" },
  { title: "Explore a New Street", icon: "🗺️", xp: 30, stat: "athleticism", subtitle: "Go left instead of right", difficulty: "easy" },
  { title: "Read Outside", icon: "🌿", xp: 25, stat: "intelligence", subtitle: "One chapter under the sky", difficulty: "easy" },
  { title: "Write a Letter to Future You", icon: "✉️", xp: 60, stat: "intelligence", subtitle: "Seal it. Open in a year.", difficulty: "medium" },
  { title: "Master a Weird Skill", icon: "🎯", xp: 100, stat: "discipline", subtitle: "Juggle. Whistle. Yo-yo.", difficulty: "hard" },
  { title: "Cold Water Face Dunk", icon: "🧊", xp: 40, stat: "discipline", subtitle: "30 seconds. Wake up.", difficulty: "medium" },
  { title: "Dance Like Nobody's Watching", icon: "💃", xp: 35, stat: "creativity", subtitle: "For one whole song", difficulty: "easy" },
  { title: "Build a Fort", icon: "🏰", xp: 50, stat: "creativity", subtitle: "Blankets. Pillows. Pride.", difficulty: "medium" },
  { title: "Climb Something", icon: "🧗", xp: 80, stat: "athleticism", subtitle: "Tree. Rock. Anything.", difficulty: "hard" },
  { title: "Learn a Card Trick", icon: "🃏", xp: 45, stat: "creativity", subtitle: "Fool one person today", difficulty: "medium" },
  { title: "Plant Something", icon: "🌱", xp: 60, stat: "health", subtitle: "Anywhere it'll grow", difficulty: "medium" },
  { title: "Stargaze for 15 Minutes", icon: "✨", xp: 40, stat: "discipline", subtitle: "No phone. Just sky.", difficulty: "easy" },
];

const HABITS: Item[] = [
  { title: "Gym Session", icon: "🏋️", xp: 40, stat: "strength", subtitle: "Push, pull, or legs", difficulty: "medium" },
  { title: "Meditation", icon: "🧘", xp: 20, stat: "discipline", subtitle: "10 min of stillness", difficulty: "easy" },
  { title: "Reading", icon: "📖", xp: 25, stat: "intelligence", subtitle: "20 focused minutes", difficulty: "easy" },
  { title: "Stretching", icon: "🤸", xp: 15, stat: "health", subtitle: "Loosen up", difficulty: "easy" },
  { title: "Coding", icon: "💻", xp: 35, stat: "intelligence", subtitle: "One commit", difficulty: "medium" },
  { title: "Journaling", icon: "📝", xp: 20, stat: "discipline", subtitle: "Reflect on today", difficulty: "easy" },
];

const HOBBIES: Item[] = [
  { title: "Photography", icon: "📸", xp: 30, stat: "creativity", subtitle: "Golden hour shots", difficulty: "easy" },
  { title: "Chess", icon: "♟️", xp: 25, stat: "intelligence", subtitle: "Play one match", difficulty: "medium" },
  { title: "Cycling", icon: "🚵", xp: 45, stat: "athleticism", subtitle: "Any distance", difficulty: "medium" },
  { title: "Running", icon: "🏃", xp: 40, stat: "athleticism", subtitle: "Even 1 km", difficulty: "medium" },
  { title: "Drawing", icon: "✏️", xp: 25, stat: "creativity", subtitle: "Fill a page", difficulty: "easy" },
  { title: "Piano", icon: "🎹", xp: 30, stat: "creativity", subtitle: "Practice a piece", difficulty: "medium" },
];

function Explore() {
  const [tab, setTab] = useState<"side" | "habits" | "hobbies">("side");
  const [randomQuest, setRandomQuest] = useState<Item | null>(null);
  const [generating, setGenerating] = useState(false);
  const state = useAscend();
  const items = tab === "side" ? SIDE_QUESTS : tab === "habits" ? HABITS : HOBBIES;
  const allTitles = state.dailyQuests.map((q) => q.title);
  const seenIds = [...state.seenQuestIds, ...allTitles];
  const dailyFull = state.dailyQuests.length >= 10;

  const addToToday = (item: Item) => {
    if (dailyFull) return;
    const quest = generateSideQuest(state.interests, seenIds);
    quest.title = item.title; quest.subtitle = item.subtitle; quest.icon = item.icon; quest.xp = item.xp; quest.stat = item.stat; quest.difficulty = item.difficulty;
    quest.id = `m${Date.now()}`;
    addSideQuest(quest);
  };

  const handleRandomGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const quest = generateRandomQuest(state.interests, seenIds, state.mood ?? undefined);
      setRandomQuest({ title: quest.title, icon: quest.icon, xp: quest.xp, stat: quest.stat, subtitle: quest.subtitle, difficulty: quest.difficulty! });
      setGenerating(false);
    }, 800);
  };

  const acceptRandomQuest = () => {
    if (!randomQuest || dailyFull) return;
    const quest = generateSideQuest(state.interests, seenIds);
    quest.title = randomQuest.title; quest.subtitle = randomQuest.subtitle; quest.icon = randomQuest.icon; quest.xp = randomQuest.xp; quest.stat = randomQuest.stat; quest.difficulty = randomQuest.difficulty;
    quest.id = `r${Date.now()}`;
    addSideQuest(quest);
    setRandomQuest(null);
  };

  return (
    <AppShell>
      <header className="mb-6 animate-rise-fade">
        <h1 className="font-display text-3xl font-extrabold tracking-tighter">Explore</h1>
        <p className="text-zinc-500 text-sm mt-1">Turn everyday life into an open world.</p>
      </header>

      <button
        onClick={handleRandomGenerate}
        disabled={generating}
        className="w-full mb-6 bg-gradient-to-r from-ascend-violet to-ascend-gold text-white font-bold py-4 rounded-2xl active:scale-95 transition-transform relative overflow-hidden disabled:opacity-70"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {generating ? (
            <>
              <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>🎲 Generate Random Adventure</>
          )}
        </span>
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-linear-to-r from-transparent via-white/25 to-transparent" />
      </button>

      {/* Random quest result card */}
      {randomQuest && (
        <div className="mb-6 bg-card border-2 border-ascend-violet/40 p-5 rounded-3xl animate-ascend-in relative overflow-hidden">
          <div className="absolute -right-10 -top-10 size-32 bg-ascend-violet/20 rounded-full blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-ascend-violet uppercase tracking-widest">Random Quest</span>
              <button onClick={() => setRandomQuest(null)} className="text-zinc-500 hover:text-zinc-300 text-sm">✕</button>
            </div>
            <div className="flex items-start gap-4 mb-4">
              <div className="size-16 bg-zinc-900 rounded-2xl grid place-items-center border border-white/5 text-3xl shrink-0">{randomQuest.icon}</div>
              <div>
                <p className="font-bold text-base">{randomQuest.title}</p>
                <p className="text-sm text-zinc-400 mt-0.5">{randomQuest.subtitle}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${DIFFICULTY_META[randomQuest.difficulty].color}`}>
                    {"★".repeat(DIFFICULTY_META[randomQuest.difficulty].stars)} {DIFFICULTY_META[randomQuest.difficulty].label}
                  </span>
                  <span className="text-[10px] text-zinc-600">·</span>
                  <span className="text-[10px] font-bold text-ascend-gold">+{randomQuest.xp} XP</span>
  <span className="text-[10px] text-zinc-600">·</span>
                  <span className="text-[10px] text-zinc-500">{randomQuest.stat}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleRandomGenerate} disabled={generating} className="flex-1 border border-white/10 bg-white/5 text-zinc-300 font-semibold py-3 rounded-xl text-sm active:scale-95 transition-transform">↻ Reroll</button>
              <button onClick={acceptRandomQuest} disabled={dailyFull} className="flex-1 bg-gradient-to-r from-ascend-violet to-ascend-gold text-white font-bold py-3 rounded-xl text-sm active:scale-95 transition-transform disabled:opacity-50">{dailyFull ? "Quest list full" : "+ Accept Quest"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-1 mb-6 bg-zinc-900/60 p-1 rounded-2xl border border-white/5">
        {(["side", "habits", "hobbies"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${tab === t ? "bg-ascend-violet text-white" : "text-zinc-500"}`}>
            {t === "side" ? "Quests" : t}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {items.map((it) => {
          const diff = DIFFICULTY_META[it.difficulty];
          const added = allTitles.includes(it.title);
          return (
            <div key={it.title} className="bg-card border border-white/5 p-4 rounded-2xl flex items-center justify-between animate-rise-fade">
              <div className="flex items-center gap-4 min-w-0">
                <div className="size-12 bg-zinc-900 rounded-xl grid place-items-center border border-white/5 text-xl shrink-0">{it.icon}</div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{it.title}</p>
                  <p className="text-xs text-zinc-500 truncate">{it.subtitle} · +{it.xp} XP</p>
                  <span className={`inline-block text-[9px] font-bold uppercase tracking-wider mt-0.5 ${diff.color}`}>{"★".repeat(diff.stars)} {diff.label}</span>
                </div>
              </div>
              <button
                onClick={() => addToToday(it)}
                disabled={added || dailyFull}
                className="shrink-0 text-xs font-bold px-3 py-2 rounded-lg active:scale-95 transition-transform disabled:opacity-30 disabled:cursor-not-allowed"
                style={!added ? { background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" } : {}}
              >
                {added ? "Added" : "+ Add"}
              </button>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
