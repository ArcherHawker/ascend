import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAscend, STAT_META, useFreezeToken, type StatKey, levelFromXp } from "@/lib/ascend-store";

export const Route = createFileRoute("/stats")({ component: Stats });

function Stats() {
  const state = useAscend();
  const keys = Object.keys(STAT_META) as StatKey[];
  const { level } = levelFromXp(state.xp);
  const size = 260, cx = size / 2, cy = size / 2, radius = 100;
  const angle = (i: number) => (Math.PI * 2 * i) / keys.length - Math.PI / 2;
  const point = (i: number, v: number) => { const r = (v / 100) * radius; return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))]; };
  const poly = keys.map((k, i) => point(i, state.stats[k]).join(",")).join(" ");
  const labels = keys.map((k, i) => { const [x, y] = [cx + (radius + 22) * Math.cos(angle(i)), cy + (radius + 22) * Math.sin(angle(i))]; return { x, y, key: k }; });

  return (
    <AppShell>
      <header className="mb-6 animate-rise-fade"><h1 className="font-display text-3xl font-extrabold tracking-tighter">Stats</h1><p className="text-zinc-500 text-sm mt-1">Your attributes evolve as you complete quests.</p></header>
      <section className="bg-card border border-white/5 rounded-3xl p-6 mb-6 flex justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          {[0.25, 0.5, 0.75, 1].map((f) => <polygon key={f} points={keys.map((_, i) => { const [x, y] = [cx + radius * f * Math.cos(angle(i)), cy + radius * f * Math.sin(angle(i))]; return `${x},${y}`; }).join(" ")} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />)}
          {keys.map((_, i) => { const [x, y] = [cx + radius * Math.cos(angle(i)), cy + radius * Math.sin(angle(i))]; return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.05)" />; })}
          <polygon points={poly} fill="rgba(139,92,246,0.25)" stroke="#8b5cf6" strokeWidth={2} className="drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
          {labels.map((l) => <text key={l.key} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle" className="fill-zinc-500 text-[9px] font-bold uppercase tracking-widest">{STAT_META[l.key].icon}</text>)}
        </svg>
      </section>
      <section className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Level" value={level.toString()} />
        <StatCard label="XP" value={state.xp.toString()} />
        <StatCard label="Streak" value={`${state.streak}🔥`} />
      </section>
      <section className="bg-card border border-white/5 rounded-3xl p-5 mb-6">
        <h2 className="font-display text-lg font-extrabold mb-4">Streak System</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1"><span className="text-xl">🔥</span><span className="font-display font-black text-2xl">{state.streak}</span></div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Current Streak</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1"><span className="text-xl">🏆</span><span className="font-display font-black text-2xl">{state.longestStreak}</span></div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Longest Streak</p>
          </div>
        </div>
        <div className="flex items-center justify-between bg-black/20 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">❄️</span>
            <div>
              <p className="text-sm font-bold">Freeze Tokens</p>
              <p className="text-[10px] text-zinc-500">Earned via achievements</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-display font-black text-xl text-sky-400">{state.freezeTokens}</span>
            <button
              onClick={() => useFreezeToken()}
              disabled={state.freezeTokens <= 0}
              className="text-xs font-bold bg-sky-500/20 border border-sky-500/30 text-sky-300 px-3 py-2 rounded-lg active:scale-95 transition-transform disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Use
            </button>
          </div>
        </div>
      </section>
      <section className="space-y-2">
        {keys.map((k) => (
          <div key={k} className="bg-card border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-3"><span className="text-lg">{STAT_META[k].icon}</span><span className="text-sm font-semibold">{STAT_META[k].label}</span></div><span className="text-xs font-mono font-bold tabular-nums text-zinc-400">{state.stats[k]}<span className="text-zinc-600">/100</span></span></div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${state.stats[k]}%`, background: `linear-gradient(to right, ${STAT_META[k].color}, ${STAT_META[k].color}aa)` }} /></div>
          </div>
        ))}
      </section>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return <div className="bg-card border border-white/5 rounded-2xl p-4 text-center"><div className="font-display font-extrabold text-2xl">{value}</div><div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1 font-bold">{label}</div></div>;
}
