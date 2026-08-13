import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAscend } from "@/lib/ascend-store";
import { sounds } from "@/lib/sounds";

export const Route = createFileRoute("/")({ component: Landing });

const FEATURES = [
  { icon: "⚔️", title: "Real-Life Quests", desc: "Turn your daily habits into adventures with XP rewards." },
  { icon: "📈", title: "Level Up Stats", desc: "Build Strength, Intelligence, Discipline and five more attributes." },
  { icon: "🔥", title: "Daily Streaks", desc: "Keep the fire alive with streak tracking and freeze tokens." },
  { icon: "🏆", title: "Unlock Achievements", desc: "Collect 13+ milestones as you grow your real-world character." },
];

const STATS = [
  { value: "8", label: "Stats" },
  { value: "13+", label: "Achievements" },
  { value: "∞", label: "Quests" },
];

function AscendLogo({ size = 96, animated = true }: { size?: number; animated?: boolean }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {animated && <div className="absolute inset-0 bg-ascend-violet/40 blur-3xl rounded-full animate-glow-pulse" />}
      <div className="relative size-full rounded-[28%] bg-gradient-to-tr from-ascend-violet via-ascend-fuchsia to-ascend-gold p-[2px]">
        <div className="size-full rounded-[28%] bg-nebula grid place-items-center overflow-hidden">
          <svg viewBox="0 0 48 48" className="w-3/5 h-3/5" fill="none">
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="48" x2="48" y2="0">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="50%" stopColor="#c026d3" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
            </defs>
            <path
              d="M24 4 L40 28 L30 28 L30 44 L18 44 L18 28 L8 28 Z"
              fill="url(#logoGrad)"
              style={animated ? { animation: "logo-pulse 3s ease-in-out infinite" } : undefined}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Landing() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const ascend = useAscend();
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1600),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (phase !== 3 || loading) return;
    if (session && ascend.onboarded) navigate({ to: "/home", replace: true });
  }, [phase, loading, session, ascend.onboarded, navigate]);

  const particles = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    id: i,
    left: (i * 37) % 100,
    size: 2 + (i % 4),
    dur: 5 + (i % 6),
    delay: i * 0.18,
    color: i % 3 === 0 ? "#fbbf24" : i % 3 === 1 ? "#a78bfa" : "#c026d3",
  })), []);

  return (
    <div className="min-h-[100dvh] bg-nebula relative overflow-hidden flex flex-col">
      <div className="aurora-bg" />
      <div className="starfield" />

      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {particles.map((p) => (
          <span key={p.id} className="absolute bottom-0 rounded-full" style={{ left: `${p.left}%`, width: `${p.size}px`, height: `${p.size}px`, background: p.color, animation: `particle-up ${p.dur}s ease-out ${p.delay}s infinite` }} />
        ))}
      </div>

      <nav className={`relative z-20 flex items-center justify-between px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-4 transition-all duration-700 ${phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}>
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-gradient-to-tr from-ascend-violet via-ascend-fuchsia to-ascend-gold p-[1.5px]">
            <div className="size-full rounded-[7px] bg-nebula grid place-items-center">
              <svg viewBox="0 0 48 48" className="w-3/4 h-3/4" fill="none">
                <path d="M24 4 L40 28 L30 28 L30 44 L18 44 L18 28 L8 28 Z" fill="url(#logoGrad)" />
              </svg>
            </div>
          </div>
          <span className="font-display font-extrabold tracking-tight">Ascend</span>
        </div>
        {session ? (
          <Link to="/home" onClick={() => sounds.pageTransition()} className="text-xs font-bold bg-white/5 border border-white/10 px-4 py-2 rounded-lg active:scale-95 transition-transform">Open App →</Link>
        ) : (
          <Link to="/auth" onClick={() => sounds.pageTransition()} className="text-xs font-bold text-zinc-300 active:scale-95 transition-transform">Sign in</Link>
        )}
      </nav>

      <header className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pt-4 pb-10">
        <div className={`transition-all duration-1000 ${phase >= 1 ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-75 blur-lg"}`}>
          <AscendLogo size={96} />
        </div>

        <h1 className={`mt-8 font-display font-black text-4xl sm:text-5xl tracking-tighter leading-[1.05] transition-all duration-1000 ${phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          Level up your<br />real life.
        </h1>

        <p className={`mt-5 text-zinc-400 text-sm max-w-xs leading-relaxed transition-all duration-1000 delay-100 ${phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          Turn habits into quests, earn XP, build stats, and watch your character grow. Your real life is the game.
        </p>

        <div className={`mt-8 flex flex-col gap-3 w-full max-w-xs transition-all duration-700 ${phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <Link
            to="/auth"
            onClick={() => sounds.buttonPress()}
            className="w-full bg-gradient-to-r from-ascend-violet to-ascend-fuchsia text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-ascend-violet/30 active:scale-95 transition-transform"
          >
            Start Your Journey
          </Link>
          <Link
            to="/auth?mode=signin"
            onClick={() => sounds.buttonPress()}
            className="w-full bg-white/5 border border-white/15 text-zinc-100 font-bold py-3.5 rounded-2xl backdrop-blur active:scale-95 transition-transform"
          >
            Login
          </Link>
        </div>
      </header>

      <section className={`relative z-10 px-6 pb-8 transition-all duration-700 ${phase >= 3 ? "opacity-100" : "opacity-0"}`}>
        <div className="grid grid-cols-3 gap-3 bg-white/[0.03] border border-white/5 rounded-2xl p-4 backdrop-blur">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-display font-black text-2xl text-ascend-gold">{s.value}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={`relative z-10 px-6 pb-12 transition-all duration-700 ${phase >= 3 ? "opacity-100" : "opacity-0"}`}>
        <div className="space-y-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex items-start gap-4 backdrop-blur">
              <div className="text-2xl shrink-0">{f.icon}</div>
              <div>
                <h3 className="font-bold text-sm">{f.title}</h3>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 text-center pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 border-t border-white/5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-700">Ascend v0.1 Beta</p>
      </footer>
    </div>
  );
}
