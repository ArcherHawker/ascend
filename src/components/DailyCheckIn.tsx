import { useState, useEffect } from "react";
import { useAscend, setMood, type Mood } from "@/lib/ascend-store";
import { sounds } from "@/lib/sounds";

const MOODS: { key: Mood; emoji: string; label: string; color: string }[] = [
  { key: "great", emoji: "😀", label: "Great", color: "from-emerald-500/30 to-emerald-700/20 border-emerald-500/40" },
  { key: "good", emoji: "🙂", label: "Good", color: "from-sky-500/30 to-sky-700/20 border-sky-500/40" },
  { key: "okay", emoji: "😐", label: "Okay", color: "from-amber-500/30 to-amber-700/20 border-amber-500/40" },
  { key: "low", emoji: "😞", label: "Low", color: "from-rose-500/30 to-rose-700/20 border-rose-500/40" },
];

export function DailyCheckIn() {
  const state = useAscend();
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<Mood | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const alreadyCheckedIn = state.moodDate === today;

  useEffect(() => {
    if (!alreadyCheckedIn) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [alreadyCheckedIn]);

  if (!visible || alreadyCheckedIn) return null;

  const handleSelect = (mood: Mood) => {
    setSelected(mood);
    sounds.buttonPress();
    setTimeout(() => {
      setMood(mood);
      sounds.questComplete();
      setVisible(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-page-enter">
      <div className="w-full max-w-sm bg-nebula border border-white/10 rounded-3xl p-6 pb-8">
        <div className="text-center mb-6">
          <div className="size-16 mx-auto rounded-full bg-gradient-to-tr from-ascend-violet/30 to-ascend-gold/30 grid place-items-center text-3xl mb-3">
            ✨
          </div>
          <h2 className="font-display text-xl font-black tracking-tight">How are you feeling today?</h2>
          <p className="text-xs text-zinc-500 mt-1">Your mood shapes today's quest suggestions.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {MOODS.map((m) => (
            <button
              key={m.key}
              onClick={() => handleSelect(m.key)}
              className={`bg-gradient-to-br ${m.color} border rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-95 ${selected === m.key ? "scale-105 ring-2 ring-white/30" : ""}`}
            >
              <span className="text-4xl">{m.emoji}</span>
              <span className="text-sm font-bold">{m.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => { sounds.buttonPress(); setVisible(false); }}
          className="w-full mt-4 text-xs text-zinc-500 font-bold py-2 active:scale-95 transition-transform"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

export function MoodBadge() {
  const state = useAscend();
  const today = new Date().toISOString().slice(0, 10);
  if (state.moodDate !== today || !state.mood) return null;

  const mood = MOODS.find((m) => m.key === state.mood);
  if (!mood) return null;

  return (
    <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
      <span className="text-base">{mood.emoji}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Feeling {mood.label}</span>
    </div>
  );
}
