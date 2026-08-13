import { createFileRoute } from "@tanstack/react-router";
import { useAscend, levelFromXp, type AdventureEntry } from "@/lib/ascend-store";
import { sounds } from "@/lib/sounds";

export const Route = createFileRoute("/adventure-map")({ component: AdventureMap });

const STAT_ICONS: Record<string, string> = {
  strength: "💪", intelligence: "📚", health: "❤️", discipline: "⚡", social: "👥", creativity: "🎨", wealth: "💰", athleticism: "⚽", adventure: "🌎", focus: "🎯", sleep: "😴", goals: "🏔️",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "from-emerald-500/30 to-emerald-700/20 border-emerald-500/30",
  medium: "from-amber-500/30 to-amber-700/20 border-amber-500/30",
  hard: "from-orange-500/30 to-red-700/20 border-orange-500/30",
  epic: "from-ascend-violet/40 to-ascend-fuchsia/30 border-ascend-violet/40",
};

function AdventureNode({ adventure, index, total }: { adventure: AdventureEntry; index: number; total: number }) {
  const isLast = index === total - 1;
  const diffColor = DIFFICULTY_COLORS[adventure.difficulty] ?? DIFFICULTY_COLORS.medium;

  return (
    <div className="relative flex flex-col items-center w-full">
      {/* Path connector */}
      {!isLast && (
        <div className="absolute top-16 w-1 h-20 sm:h-24 bg-gradient-to-b from-ascend-violet/40 to-ascend-violet/10 -z-0" />
      )}

      {/* Node dot on path */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 size-3 rounded-full bg-ascend-gold shadow-[0_0_12px_rgba(251,191,36,0.6)] z-10" />

      {/* Card */}
      <div className={`mt-8 w-full max-w-sm bg-gradient-to-br ${diffColor} border rounded-2xl p-3 sm:p-4 backdrop-blur`}>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="size-10 sm:size-12 rounded-xl bg-black/30 grid place-items-center text-xl sm:text-2xl shrink-0">
            {adventure.icon || STAT_ICONS[adventure.stat] || "⚔️"}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xs sm:text-sm truncate">{adventure.title}</h3>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              +{adventure.xp} XP · {adventure.difficulty}
            </p>
          </div>
          <span className="text-emerald-400 text-base sm:text-lg shrink-0">✓</span>
        </div>
        <div className="mt-2 sm:mt-3 flex items-center justify-between">
          <span className="text-[10px] text-zinc-500">{new Date(adventure.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Completed</span>
        </div>
      </div>
    </div>
  );
}

function EmptyMap() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="size-20 rounded-full bg-ascend-violet/10 grid place-items-center text-4xl mb-4">🗺️</div>
      <h2 className="font-display text-lg font-bold mb-2">No Adventures Yet</h2>
      <p className="text-sm text-zinc-500 max-w-xs">
        Complete quests with Epic or Hard difficulty, or any adventure-stat quest, to mark your map.
      </p>
    </div>
  );
}

function AdventureMap() {
  const state = useAscend();
  const { level } = levelFromXp(state.xp);
  const adventures = state.adventures;

  return (
    <div className="pt-2 pb-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tighter">Adventure Map</h1>
          <p className="text-xs text-zinc-500 mt-1">{adventures.length} adventures completed</p>
        </div>
        <div className="size-12 rounded-full bg-gradient-to-tr from-ascend-violet to-ascend-gold p-[2px]">
          <div className="size-full rounded-full bg-nebula grid place-items-center">
            <span className="text-xs font-black">Lv {level}</span>
          </div>
        </div>
      </div>

      {/* Map legend */}
      <div className="flex items-center gap-4 mb-6 bg-white/[0.03] border border-white/5 rounded-xl p-3">
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-zinc-400">Easy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-amber-500" />
          <span className="text-[10px] text-zinc-400">Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-orange-500" />
          <span className="text-[10px] text-zinc-400">Hard</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-ascend-violet" />
          <span className="text-[10px] text-zinc-400">Epic</span>
        </div>
      </div>

      {adventures.length === 0 ? (
        <EmptyMap />
      ) : (
        <div className="space-y-2">
          {/* Starting point */}
          <div className="flex flex-col items-center mb-2">
            <div className="size-4 rounded-full bg-ascend-violet shadow-[0_0_16px_rgba(167,139,250,0.8)]" />
            <div className="h-8 w-1 bg-gradient-to-b from-ascend-violet to-ascend-violet/30" />
            <p className="text-[10px] uppercase tracking-widest text-ascend-violet font-bold mt-1">Start</p>
          </div>

          {adventures.map((adv, i) => (
            <AdventureNode key={adv.id} adventure={adv} index={i} total={adventures.length} />
          ))}

          {/* End point */}
          <div className="flex flex-col items-center mt-4">
            <div className="h-8 w-1 bg-gradient-to-b from-ascend-violet/30 to-transparent" />
            <div className="size-6 rounded-full border-2 border-dashed border-zinc-600 grid place-items-center">
              <span className="text-[10px] text-zinc-600">?</span>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mt-1">Next Adventure</p>
          </div>
        </div>
      )}
    </div>
  );
}
