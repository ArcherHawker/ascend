import { useEffect, useMemo, useState } from "react";

export type AchievementData = { id: string; label: string; icon: string; tier: string };

const TIER_COLORS: Record<string, string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd700",
  diamond: "#67e8f9",
};

export function AchievementOverlay({ data, onDone }: { data: AchievementData; onDone: () => void }) {
  const [show, setShow] = useState(true);
  const tierColor = TIER_COLORS[data.tier] ?? "#a78bfa";

  useEffect(() => {
    const t = setTimeout(() => { setShow(false); onDone(); }, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  const particles = useMemo(
    () => Array.from({ length: 30 }, (_, i) => ({
      id: i,
      tx: (Math.random() - 0.5) * 350,
      ty: (Math.random() - 0.5) * 450 - 80,
      delay: Math.random() * 0.4,
    })),
    [],
  );

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
      {/* Screen glow */}
      <div className="absolute inset-0 animate-levelup-glow" style={{ background: `radial-gradient(circle at 50% 40%, ${tierColor}40, ${tierColor}15 40%, transparent 70%)` }} />

      {/* Expanding rings */}
      <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 size-28 rounded-full border-2 animate-ring-burst" style={{ borderColor: tierColor }} />
      <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 size-28 rounded-full border-2 animate-ring-burst" style={{ borderColor: tierColor, animationDelay: "0.2s" }} />

      {/* Burst particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute top-[38%] left-1/2 size-2 rounded-full animate-xp-burst"
          style={{ background: tierColor, ["--tx" as string]: `${p.tx}px`, ["--ty" as string]: `${p.ty}px`, animationDelay: `${p.delay}s` }}
        />
      ))}

      {/* Center content */}
      <div className="relative text-center animate-levelup-text">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-3" style={{ color: tierColor }}>Achievement Unlocked</p>
        <div className="relative mx-auto w-fit mb-4">
          <div className="absolute inset-0 blur-2xl rounded-full animate-glow-pulse" style={{ background: `${tierColor}60` }} />
          <div className="relative size-24 rounded-3xl grid place-items-center text-5xl animate-reward-reveal" style={{ background: `linear-gradient(135deg, ${tierColor}30, ${tierColor}10)`, border: `2px solid ${tierColor}60` }}>
            {data.icon}
          </div>
        </div>
        <p className="font-display font-black text-2xl text-white tracking-tight">{data.label}</p>
        <p className="text-[10px] uppercase tracking-widest mt-2" style={{ color: `${tierColor}cc` }}>{data.tier} Tier</p>
      </div>
    </div>
  );
}
