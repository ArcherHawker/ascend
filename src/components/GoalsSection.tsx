import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { sounds } from "@/lib/sounds";
import { useAuth } from "@/lib/auth-context";
import { setState } from "@/lib/ascend-store";

export type Goal = {
  id: string;
  title: string;
  icon: string;
  category: string;
  target_value: number;
  current_value: number;
  deadline: string | null;
  xp_reward: number;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
};

const CATEGORY_ICONS: Record<string, string> = {
  athleticism: "🏃", creativity: "🎨", intelligence: "📚", discipline: "⚡", charisma: "🤝", general: "🎯",
};

export function GoalsSection() {
  const auth = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newIcon, setNewIcon] = useState("🎯");
  const [newCategory, setNewCategory] = useState("general");
  const [newTarget, setNewTarget] = useState(100);
  const [newDeadline, setNewDeadline] = useState("");
  const [newXpReward, setNewXpReward] = useState(50);

  const load = useCallback(async () => {
    if (!auth.user) return;
    setLoading(true);
    const { data } = await supabase.from("user_goals").select("*").eq("user_id", auth.user.id).order("created_at", { ascending: false });
    setGoals((data as Goal[]) ?? []);
    setLoading(false);
  }, [auth.user]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!auth.user || !newTitle.trim()) return;
    sounds.buttonPress();
    const { data } = await supabase.from("user_goals").insert({
      user_id: auth.user.id,
      title: newTitle.trim(),
      icon: newIcon,
      category: newCategory,
      target_value: newTarget,
      deadline: newDeadline || null,
      xp_reward: newXpReward,
    }).select("*").single();
    if (data) setGoals((g) => [data as Goal, ...g]);
    setNewTitle(""); setNewIcon("🎯"); setNewCategory("general"); setNewTarget(100); setNewDeadline(""); setNewXpReward(50);
    setAdding(false);
    sounds.questComplete();
  };

  const handleUpdateProgress = async (goal: Goal, delta: number) => {
    const newValue = Math.max(0, Math.min(goal.target_value, goal.current_value + delta));
    const completed = newValue >= goal.target_value;
    sounds.buttonPress();
    await supabase.from("user_goals").update({
      current_value: newValue,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    }).eq("id", goal.id);
    setGoals((g) => g.map((x) => x.id === goal.id ? { ...x, current_value: newValue, completed, completed_at: completed ? new Date().toISOString() : null } : x));
    if (completed && !goal.completed) {
      setState((s) => ({ ...s, xp: s.xp + goal.xp_reward, xpThisWeek: s.xpThisWeek + goal.xp_reward, strideScore: Math.min(100, s.strideScore + goal.xp_reward / 80) }));
      sounds.levelUp();
    }
  };

  const handleDelete = async (id: string) => {
    sounds.buttonPress();
    await supabase.from("user_goals").delete().eq("id", id);
    setGoals((g) => g.filter((x) => x.id !== id));
  };

  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);

  if (loading) return <div className="text-center text-zinc-600 text-sm py-4">Loading goals...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-extrabold">My Goals</h2>
        <button onClick={() => { setAdding(!adding); sounds.buttonPress(); }} className="text-xs font-bold text-ascend-violet active:scale-95 transition-transform">
          {adding ? "Cancel" : "+ Add Goal"}
        </button>
      </div>

      {adding && (
        <div className="bg-card border border-white/5 rounded-2xl p-4 mb-4 space-y-3 animate-rise-fade">
          <div className="flex gap-2">
            <input value={newIcon} onChange={(e) => setNewIcon(e.target.value.slice(0, 2))} className="w-12 text-center bg-black/20 border border-white/5 rounded-lg px-2 py-2 text-lg focus:outline-none focus:border-ascend-violet" />
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Goal title..." maxLength={60} className="flex-1 bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ascend-violet" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={newCategory} onChange={(e) => { setNewCategory(e.target.value); setNewIcon(CATEGORY_ICONS[e.target.value] ?? "🎯"); }} className="bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-ascend-violet">
              <option value="general">🎯 General</option>
              <option value="athleticism">🏃 Athleticism</option>
              <option value="creativity">🎨 Creativity</option>
              <option value="intelligence">📚 Intelligence</option>
              <option value="discipline">⚡ Discipline</option>
              <option value="charisma">🤝 Charisma</option>
            </select>
            <input type="number" value={newTarget} onChange={(e) => setNewTarget(Math.max(1, parseInt(e.target.value) || 1))} placeholder="Target" className="bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-ascend-violet" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} className="bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-ascend-violet" />
            <input type="number" value={newXpReward} onChange={(e) => setNewXpReward(Math.max(0, parseInt(e.target.value) || 0))} placeholder="XP Reward" className="bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-ascend-violet" />
          </div>
          <button onClick={handleAdd} className="w-full bg-gradient-to-r from-ascend-violet to-ascend-fuchsia text-white font-bold py-2.5 rounded-xl text-sm active:scale-95 transition-transform">
            Create Goal
          </button>
        </div>
      )}

      <div className="space-y-3">
        {activeGoals.length === 0 && !adding && (
          <div className="text-center text-zinc-600 text-sm py-6">No active goals. Tap &ldquo;Add Goal&rdquo; to set one.</div>
        )}
        {activeGoals.map((g) => {
          const progress = Math.round((g.current_value / g.target_value) * 100);
          const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
          return (
            <div key={g.id} className="bg-card border border-white/5 rounded-2xl p-4 animate-rise-fade">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">{g.icon}</span>
                <p className="text-sm font-bold flex-1">{g.title}</p>
                <span className="text-[10px] font-bold text-ascend-gold bg-ascend-gold/10 px-2 py-0.5 rounded-full">+{g.xp_reward} XP</span>
                <button onClick={() => handleDelete(g.id)} className="text-zinc-600 text-xs active:scale-90 transition-transform">✕</button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-2 bg-black/30 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-ascend-violet to-ascend-gold rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-[10px] font-bold text-zinc-400 w-8 text-right">{progress}%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => handleUpdateProgress(g, -10)} className="size-7 rounded-full bg-white/5 border border-white/10 text-zinc-400 grid place-items-center text-xs active:scale-90 transition-transform">−</button>
                  <span className="text-xs text-zinc-400 font-semibold">{g.current_value}/{g.target_value}</span>
                  <button onClick={() => handleUpdateProgress(g, 10)} className="size-7 rounded-full bg-ascend-violet/20 border border-ascend-violet/30 text-ascend-violet grid place-items-center text-xs active:scale-90 transition-transform">+</button>
                </div>
                {daysLeft !== null && (
                  <span className={`text-[10px] font-bold ${daysLeft < 0 ? "text-red-400" : daysLeft < 7 ? "text-amber-400" : "text-zinc-500"}`}>
                    {daysLeft < 0 ? "Overdue" : `${daysLeft}d left`}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {completedGoals.length > 0 && (
        <>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-6 mb-3">Completed ({completedGoals.length})</h3>
          <div className="space-y-2">
            {completedGoals.map((g) => (
              <div key={g.id} className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-3 flex items-center gap-3 opacity-70">
                <span className="text-lg">{g.icon}</span>
                <p className="text-sm font-bold flex-1 line-through">{g.title}</p>
                <span className="text-[10px] font-bold text-emerald-400">✓ +{g.xp_reward} XP</span>
                <button onClick={() => handleDelete(g.id)} className="text-zinc-600 text-xs active:scale-90 transition-transform">✕</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
