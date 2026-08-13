import { useEffect, useMemo, useState } from "react";

export type LevelUpData = { level: number; reward: string; rewardIcon: string };

const CONFETTI_COLORS = ["#a78bfa", "#f0abfc", "#fbbf24", "#34d399", "#60a5fa", "#f472b6"];

export function LevelUpOverlay({ data, onDone }: { data: LevelUpData; onDone: () => void }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setShow(false); onDone(); }, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  const confetti = useMemo(
    () => Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      dur: 2.2 + Math.random() * 1.5,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + Math.random() * 8,
      rotate: Math.random() * 360,
    })),
    [],
  );

  const particles = useMemo(
    () => Array.from({ length: 24 }, (_, i) => ({
      id: i,
      tx: (Math.random() - 0.5) * 300,
      ty: (Math.random() - 0.5) * 400 - 100,
      delay: Math.random() * 0.3,
    })),
    [],
  );

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
      {/* Screen glow */}
      <div className="absolute inset-0 animate-levelup-glow" style={{ background: "radial-gradient(circle at 50% 40%, rgba(167,139,250,0.4), rgba(251,191,36,0.15) 40%, transparent 70%)" }} />

      {/* Expanding rings */}
      <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 size-32 rounded-full border-2 border-ascend-violet animate-ring-burst" />
      <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 size-32 rounded-full border-2 border-ascend-gold animate-ring-burst" style={{ animationDelay: "0.15s" }} />

      {/* XP burst particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute top-[35%] left-1/2 size-2 rounded-full bg-ascend-gold animate-xp-burst"
          style={{ ["--tx" as string]: `${p.tx}px`, ["--ty" as string]: `${p.ty}px`, animationDelay: `${p.delay}s` }}
        />
      ))}

      {/* Confetti */}
      {confetti.map((c) => (
        <div
          key={c.id}
          className="absolute top-0 animate-confetti rounded-sm"
          style={{
            left: `${c.left}%`,
            width: c.size,
            height: c.size * 0.6,
            background: c.color,
            transform: `rotate(${c.rotate}deg)`,
            animationDelay: `${c.delay}s`,
            ["--dur" as string]: `${c.dur}s`,
          }}
        />
      ))}

      {/* Center text */}
      <div className="relative text-center animate-levelup-text">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-ascend-gold mb-2">Level Up</p>
        <div className="font-display font-black text-7xl tracking-tighter bg-gradient-to-b from-white to-ascend-violet bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(167,139,250,0.8)]">
          {data.level}
        </div>
        <div className="mt-4 animate-reward-reveal" style={{ animationDelay: "0.6s", opacity: 0 }}>
          <div className="text-3xl mb-1">{data.rewardIcon}</div>
          <p className="text-sm font-bold text-zinc-200">{data.reward}</p>
          <p className="text-[10px] text-zinc-500 mt-1">Reward Unlocked</p>
        </div>
      </div>
    </div>
  );
}
