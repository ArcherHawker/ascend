import { useState, useEffect } from "react";
import { useAscend, getWeeklyRecap, dismissRecap } from "@/lib/ascend-store";
import { sounds } from "@/lib/sounds";

function isSunday(): boolean {
  return new Date().getDay() === 0;
}

function getWeekKey(): string {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  sunday.setHours(0, 0, 0, 0);
  return sunday.toISOString().slice(0, 10);
}

export function WeeklyRecap() {
  const state = useAscend();
  const [visible, setVisible] = useState(false);

  const weekKey = getWeekKey();
  const alreadySeen = state.lastRecapWeek === weekKey;
  const shouldShow = isSunday() && !alreadySeen;

  useEffect(() => {
    if (shouldShow) {
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [shouldShow]);

  if (!visible || !shouldShow) return null;

  const recap = getWeeklyRecap();

  const items = [
    { icon: "⭐", label: "XP Earned", value: `+${recap.xpEarned}`, color: "text-ascend-gold" },
    { icon: "💪", label: "Workouts", value: recap.workouts, color: "text-emerald-400" },
    { icon: "📚", label: "Learning", value: `${recap.learningHours}h`, color: "text-sky-400" },
    { icon: "🌎", label: "Adventures", value: recap.adventures, color: "text-ascend-violet" },
    { icon: "🔥", label: "Day Streak", value: recap.streak, color: "text-orange-400" },
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-page-enter">
      <div className="w-full max-w-sm bg-nebula border border-white/10 rounded-3xl p-6 pb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-ascend-violet/20 to-transparent pointer-events-none" />

        <div className="relative text-center mb-6">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-ascend-gold mb-2">Sunday Recap</p>
          <h2 className="font-display text-2xl font-black tracking-tighter">Your Week</h2>
        </div>

        <div className="relative space-y-3 mb-6">
          {items.map((item) => (
            <div key={item.label} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
              <div className="size-10 rounded-xl bg-black/30 grid place-items-center text-xl shrink-0">{item.icon}</div>
              <span className="text-sm text-zinc-400 flex-1">{item.label}</span>
              <span className={`font-display font-black text-xl ${item.color}`}>{item.value}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => { sounds.levelUp(); dismissRecap(); setVisible(false); }}
          className="w-full bg-gradient-to-r from-ascend-violet to-ascend-fuchsia text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-ascend-violet/30 active:scale-95 transition-transform"
        >
          New Week, New Adventures
        </button>
      </div>
    </div>
  );
}
