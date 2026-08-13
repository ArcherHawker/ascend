import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAscend, levelFromXp, STAT_META, type AdventureEntry, type LevelHistoryEntry, type StatKey } from "@/lib/ascend-store";
import { sounds } from "@/lib/sounds";
import { useMemo } from "react";

export const Route = createFileRoute("/timeline")({ component: Timeline });

type TimelineMonth = {
  monthKey: string;
  monthLabel: string;
  year: number;
  month: number;
  events: { date: string; type: "level" | "adventure" | "achievement"; icon: string; title: string; subtitle: string }[];
};

function buildTimeline(
  levelHistory: LevelHistoryEntry[],
  adventures: AdventureEntry[],
  achievements: string[],
  xp: number,
): TimelineMonth[] {
  const events: { date: string; type: "level" | "adventure" | "achievement"; icon: string; title: string; subtitle: string }[] = [];

  levelHistory.forEach((lh) => {
    events.push({
      date: lh.date,
      type: "level",
      icon: "⭐",
      title: `Reached Level ${lh.level}`,
      subtitle: `${lh.xp} XP total`,
    });
  });

  adventures.forEach((a) => {
    events.push({
      date: a.date,
      type: "adventure",
      icon: a.icon || STAT_META[a.stat].icon,
      title: a.title,
      subtitle: `${STAT_META[a.stat].label} · +${a.xp} XP · ${a.difficulty}`,
    });
  });

  events.sort((a, b) => b.date.localeCompare(a.date));

  const byMonth = new Map<string, TimelineMonth>();
  for (const ev of events) {
    const d = new Date(ev.date);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth.has(monthKey)) {
      byMonth.set(monthKey, {
        monthKey,
        monthLabel: d.toLocaleDateString("en-US", { month: "long" }),
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        events: [],
      });
    }
    byMonth.get(monthKey)!.events.push(ev);
  }

  return Array.from(byMonth.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

function Timeline() {
  const state = useAscend();
  const navigate = useNavigate();
  const { level } = levelFromXp(state.xp);

  const timeline = useMemo(
    () => buildTimeline(state.levelHistory, state.adventures, state.achievements, state.xp),
    [state.levelHistory, state.adventures, state.achievements, state.xp],
  );

  const totalEvents = timeline.reduce((sum, m) => sum + m.events.length, 0);

  return (
    <AppShell>
      <header className="mb-6 animate-rise-fade">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => { navigate({ to: "/profile" }); sounds.buttonPress(); }} className="size-9 rounded-full bg-white/5 border border-white/10 grid place-items-center text-zinc-400 text-sm active:scale-90 transition-transform">←</button>
          <h1 className="font-display text-2xl font-black tracking-tighter">Life Timeline</h1>
        </div>
        <p className="text-sm text-zinc-500 mt-1">Your character evolution, chapter by chapter.</p>
      </header>

      {/* Summary card */}
      <div className="bg-gradient-to-br from-ascend-violet/15 via-ascend-fuchsia/10 to-ascend-gold/10 border border-ascend-violet/20 rounded-3xl p-5 mb-6 animate-rise-fade">
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-2xl bg-gradient-to-tr from-ascend-violet to-ascend-fuchsia grid place-items-center text-3xl shadow-lg shadow-ascend-violet/20">
            🏔️
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-widest text-ascend-violet font-bold">Current Level</p>
            <p className="font-display text-3xl font-black">{level}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{totalEvents} milestones across {timeline.length} months</p>
          </div>
        </div>
      </div>

      {timeline.length === 0 ? (
        <div className="text-center py-16 animate-rise-fade">
          <div className="text-5xl mb-4 opacity-30">📜</div>
          <p className="text-sm text-zinc-500">Your timeline is empty. Complete quests and level up to start writing your story!</p>
        </div>
      ) : (
        <div className="space-y-8 pb-4">
          {timeline.map((month) => (
            <div key={month.monthKey} className="animate-rise-fade">
              {/* Month header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-xl bg-ascend-violet/15 border border-ascend-violet/20 grid place-items-center text-sm font-black text-ascend-violet">
                  {String(month.month).padStart(2, "0")}
                </div>
                <div>
                  <h2 className="font-display text-lg font-extrabold">{month.monthLabel} {month.year}</h2>
                  <p className="text-[11px] text-zinc-500">{month.events.length} milestone{month.events.length > 1 ? "s" : ""}</p>
                </div>
              </div>

              {/* Events */}
              <div className="relative pl-8 ml-5 space-y-3">
                {/* Vertical line */}
                <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-gradient-to-b from-ascend-violet/40 via-ascend-violet/15 to-transparent" />

                {month.events.map((ev, i) => (
                  <div key={i} className="relative">
                    {/* Dot on line */}
                    <div className={`absolute -left-8 top-3 size-3 rounded-full border-2 border-obsidian z-10 ${ev.type === "level" ? "bg-ascend-gold shadow-[0_0_10px_rgba(251,191,36,0.5)]" : ev.type === "adventure" ? "bg-ascend-violet" : "bg-ascend-fuchsia"}`} />

                    <div className={`rounded-2xl p-3.5 border ${ev.type === "level" ? "bg-ascend-gold/5 border-ascend-gold/20" : "bg-white/[0.03] border-white/[0.06]"}`}>
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-black/30 grid place-items-center text-lg shrink-0">{ev.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{ev.title}</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">{ev.subtitle}</p>
                        </div>
                        <span className="text-[10px] text-zinc-600 shrink-0">{new Date(ev.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
