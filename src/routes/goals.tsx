import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { sounds } from "@/lib/sounds";
import { toast } from "sonner";
import {
  type Goal, type Quest, type Difficulty, type QuestStatus,
  fetchGoals, fetchQuests, createGoal, createQuest, deleteGoal, deleteQuest,
  completeQuestWithRewards, updateQuestStatus,
  CATEGORIES, DIFFICULTIES, difficultyMeta, categoryIcon, categoryLabel,
  getSuggestedQuests, getMilestones, getGoalProgress, getNextSteps,
  type SuggestedQuest,
} from "@/lib/goals-quests";
import { useAscend } from "@/lib/ascend-store";

export const Route = createFileRoute("/goals")({ component: GoalsPage });

function GoalsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const state = useAscend();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [allQuests, setAllQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [showCreateQuest, setShowCreateQuest] = useState<string | null>(null);
  const [showSuggested, setShowSuggested] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.loading && !auth.session) navigate({ to: "/", replace: true });
    else if (auth.session && !state.onboarded) navigate({ to: "/onboarding", replace: true });
  }, [auth.loading, auth.session, state.onboarded, navigate]);

  const load = useCallback(async () => {
    if (!auth.user) return;
    setLoading(true);
    try {
      const [g, q] = await Promise.all([
        fetchGoals(auth.user.id),
        fetchQuests(auth.user.id),
      ]);
      setGoals(g);
      setAllQuests(q);
    } catch (err) {
      toast.error("Failed to load goals and quests.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [auth.user]);

  useEffect(() => { load(); }, [load]);

  const questsForGoal = (goalId: string | null) =>
    allQuests.filter((q) => q.goal_id === goalId);

  const handleCreateGoal = async (input: {
    title: string; description?: string; category?: string; customCategory?: string;
    deadline?: string; xpReward?: number; icon?: string;
  }) => {
    if (!auth.user) return;
    sounds.buttonPress();
    try {
      const goal = await createGoal(auth.user.id, {
        title: input.title,
        description: input.description,
        category: input.category,
        icon: input.icon ?? categoryIcon(input.category ?? "general"),
        deadline: input.deadline,
        xp_reward: input.xpReward ?? 50,
      });
      setGoals((g) => [goal, ...g]);
      setShowCreateGoal(false);
      toast.success("Goal created!");
      sounds.questComplete();
    } catch (err) {
      toast.error("Failed to create goal.");
      console.error(err);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    sounds.buttonPress();
    try {
      await deleteGoal(id);
      setGoals((g) => g.filter((x) => x.id !== id));
      setAllQuests((q) => q.filter((x) => x.goal_id !== id));
      if (expandedGoal === id) setExpandedGoal(null);
      toast.success("Goal deleted.");
    } catch (err) {
      toast.error("Failed to delete goal.");
      console.error(err);
    }
  };

  const handleCreateQuest = async (goalId: string | null, input: {
    title: string; description?: string; category?: string; customCategory?: string;
    difficulty?: Difficulty; xpReward?: number; coinReward?: number;
    requirements?: string; proofRequired?: boolean; proofType?: string;
  }) => {
    if (!auth.user) return;
    sounds.buttonPress();
    try {
      const quest = await createQuest(auth.user.id, {
        goal_id: goalId,
        title: input.title,
        description: input.description,
        category: input.category ?? "general",
        custom_category: input.customCategory,
        difficulty: input.difficulty ?? "medium",
        xp_reward: input.xpReward ?? 30,
        coin_reward: input.coinReward ?? 5,
        requirements: input.requirements,
        proof_required: input.proofRequired ?? false,
        proof_type: (input.proofType as any) ?? null,
      });
      setAllQuests((q) => [quest, ...q]);
      setShowCreateQuest(null);
      toast.success("Quest created!");
      sounds.questComplete();
    } catch (err) {
      toast.error("Failed to create quest.");
      console.error(err);
    }
  };

  const handleAddSuggestedQuest = async (goalId: string, sq: SuggestedQuest) => {
    if (!auth.user) return;
    sounds.buttonPress();
    try {
      const quest = await createQuest(auth.user.id, {
        goal_id: goalId,
        title: sq.title,
        description: sq.description,
        category: sq.category,
        difficulty: sq.difficulty,
        xp_reward: sq.xp_reward,
        coin_reward: sq.coin_reward,
        proof_required: sq.proof_required,
        proof_type: sq.proof_type,
      });
      setAllQuests((q) => [quest, ...q]);
      toast.success(`Quest "${sq.title}" added!`);
    } catch (err) {
      toast.error("Failed to add quest.");
      console.error(err);
    }
  };

  const handleCompleteQuest = async (quest: Quest) => {
    if (quest.status === "completed") return;
    setCompletingId(quest.id);
    sounds.buttonPress();
    try {
      const result = await completeQuestWithRewards(quest);
      if (result.success && result.quest) {
        setAllQuests((qs) => qs.map((q) => q.id === quest.id ? result.quest! : q));
        const goalQuests = questsForGoal(quest.goal_id).map((q) =>
          q.id === quest.id ? { ...q, status: "completed" as QuestStatus } : q
        );
        if (quest.goal_id) {
          const progress = getGoalProgress(goalQuests);
          setGoals((gs) => gs.map((g) =>
            g.id === quest.goal_id
              ? { ...g, current_value: progress, completed: progress === 100, status: progress === 100 ? "completed" : "active", completed_at: progress === 100 ? new Date().toISOString() : g.completed_at }
              : g
          ));
        }
        sounds.questComplete();
        setTimeout(() => sounds.xpGain(), 200);
        toast.success(`Quest complete! +${quest.xp_reward} XP, +${quest.coin_reward} coins`);
      } else {
        toast.error(result.error ?? "Failed to complete quest.");
      }
    } catch (err) {
      toast.error("Failed to complete quest.");
      console.error(err);
    } finally {
      setCompletingId(null);
    }
  };

  const handleDeleteQuest = async (id: string) => {
    sounds.buttonPress();
    try {
      await deleteQuest(id);
      setAllQuests((q) => q.filter((x) => x.id !== id));
      toast.success("Quest deleted.");
    } catch (err) {
      toast.error("Failed to delete quest.");
      console.error(err);
    }
  };

  const handleUnlockQuest = async (quest: Quest) => {
    sounds.buttonPress();
    try {
      const updated = await updateQuestStatus(quest.id, "available");
      setAllQuests((qs) => qs.map((q) => q.id === quest.id ? updated : q));
    } catch (err) {
      toast.error("Failed to unlock quest.");
      console.error(err);
    }
  };

  const handleActivateQuest = async (quest: Quest) => {
    sounds.buttonPress();
    try {
      const updated = await updateQuestStatus(quest.id, "active");
      setAllQuests((qs) => qs.map((q) => q.id === quest.id ? updated : q));
    } catch (err) {
      toast.error("Failed to activate quest.");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <div className="text-zinc-500 text-sm animate-pulse">Loading goals...</div>
        </div>
      </AppShell>
    );
  }

  const activeGoals = goals.filter((g) => g.status !== "completed" && g.status !== "abandoned");
  const completedGoals = goals.filter((g) => g.status === "completed");

  return (
    <AppShell>
      <header className="flex items-center justify-between mb-6 animate-rise-fade">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Goals & Quests</h1>
          <p className="text-xs text-zinc-500 mt-1">Break your ambitions into steps</p>
        </div>
        <button
          onClick={() => { setShowCreateGoal(true); sounds.buttonPress(); }}
          className="size-10 rounded-full bg-ascend-violet/20 border border-ascend-violet/30 grid place-items-center active:scale-90 transition-transform"
          aria-label="Create goal"
        >
          <span className="text-ascend-violet text-xl font-bold">+</span>
        </button>
      </header>

      {showCreateGoal && (
        <CreateGoalForm
          onSubmit={handleCreateGoal}
          onCancel={() => setShowCreateGoal(false)}
        />
      )}

      {activeGoals.length === 0 && !showCreateGoal && (
        <div className="text-center py-16 animate-rise-fade">
          <div className="text-5xl mb-4 opacity-50">🎯</div>
          <p className="text-zinc-400 text-sm font-semibold mb-1">No goals yet</p>
          <p className="text-zinc-600 text-xs">Tap the + button to create your first goal</p>
        </div>
      )}

      <div className="space-y-4">
        {activeGoals.map((goal) => {
          const goalQuests = questsForGoal(goal.id);
          const progress = getGoalProgress(goalQuests);
          const milestones = getMilestones(goalQuests);
          const nextSteps = getNextSteps(goalQuests);
          const isExpanded = expandedGoal === goal.id;
          const daysLeft = goal.deadline
            ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;

          return (
            <div key={goal.id} className="bg-card border border-white/5 rounded-2xl overflow-hidden animate-rise-fade">
              {/* Goal header */}
              <button
                onClick={() => { setExpandedGoal(isExpanded ? null : goal.id); sounds.buttonPress(); }}
                className="w-full p-4 flex items-center gap-3 text-left"
              >
                <span className="text-2xl shrink-0">{goal.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{goal.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-ascend-violet to-ascend-gold rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 tabular-nums">{progress}%</span>
                  </div>
                </div>
                {daysLeft !== null && (
                  <span className={`text-[10px] font-bold shrink-0 ${daysLeft < 0 ? "text-red-400" : daysLeft < 7 ? "text-amber-400" : "text-zinc-500"}`}>
                    {daysLeft < 0 ? "Overdue" : `${daysLeft}d`}
                  </span>
                )}
                <span className={`text-zinc-600 text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}>▾</span>
              </button>

              {goal.description && isExpanded && (
                <p className="px-4 pb-2 text-xs text-zinc-500 leading-relaxed">{goal.description}</p>
              )}

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  {/* Goal meta */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-zinc-500 bg-white/5 px-2 py-1 rounded-full">
                      {categoryIcon(goal.category)} {categoryLabel(goal.category)}
                    </span>
                    <span className="text-[10px] font-bold text-ascend-gold bg-ascend-gold/10 px-2 py-1 rounded-full">
                      +{goal.xp_reward} XP
                    </span>
                    <span className="text-[10px] font-bold text-zinc-500">
                      {goalQuests.filter((q) => q.status === "completed").length}/{goalQuests.length} quests
                    </span>
                  </div>

                  {/* Next steps */}
                  {nextSteps.length > 0 && (
                    <div className="bg-white/5 rounded-xl p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Work on next</p>
                      <div className="space-y-1.5">
                        {nextSteps.map((q) => (
                          <div key={q.id} className="flex items-center gap-2 text-xs">
                            <span className="text-ascend-violet">→</span>
                            <span className="text-zinc-300 truncate flex-1">{q.title}</span>
                            <span className="text-[9px] text-zinc-600 shrink-0">+{q.xp_reward} XP</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Milestones */}
                  {milestones.length > 0 && (
                    <div className="bg-white/5 rounded-xl p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Milestones</p>
                      <div className="space-y-1.5">
                        {milestones.map((m, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className={m.done ? "text-emerald-400" : "text-zinc-600"}>
                              {m.done ? "✓" : "○"}
                            </span>
                            <span className={m.done ? "text-zinc-500 line-through" : "text-zinc-300"}>{m.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quest cards */}
                  {goalQuests.length > 0 && (
                    <div className="space-y-2">
                      {goalQuests.map((q) => (
                        <QuestCard
                          key={q.id}
                          quest={q}
                          onComplete={() => handleCompleteQuest(q)}
                          onDelete={() => handleDeleteQuest(q.id)}
                          onUnlock={() => handleUnlockQuest(q)}
                          onActivate={() => handleActivateQuest(q)}
                          completing={completingId === q.id}
                        />
                      ))}
                    </div>
                  )}

                  {goalQuests.length === 0 && (
                    <div className="text-center py-4 text-xs text-zinc-600">
                      No quests yet. Add one below or try suggested quests.
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setShowCreateQuest(goal.id); sounds.buttonPress(); }}
                      className="flex-1 text-xs font-bold text-ascend-violet bg-ascend-violet/10 border border-ascend-violet/20 rounded-lg py-2 active:scale-95 transition-transform"
                    >
                      + Quest
                    </button>
                    <button
                      onClick={() => { setShowSuggested(showSuggested === goal.id ? null : goal.id); sounds.buttonPress(); }}
                      className="flex-1 text-xs font-bold text-zinc-400 bg-white/5 border border-white/10 rounded-lg py-2 active:scale-95 transition-transform"
                    >
                      ✨ Suggested
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="text-xs font-bold text-zinc-600 bg-white/5 border border-white/5 rounded-lg px-3 py-2 active:scale-95 transition-transform"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Suggested quests */}
                  {showSuggested === goal.id && (
                    <div className="space-y-2 animate-rise-fade">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Suggested quests for this goal</p>
                      {getSuggestedQuests(goal.category).map((sq, i) => (
                        <button
                          key={i}
                          onClick={() => handleAddSuggestedQuest(goal.id, sq)}
                          className="w-full flex items-center gap-3 bg-white/5 border border-white/5 rounded-xl p-3 text-left active:scale-98 transition-transform"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{sq.title}</p>
                            <p className="text-[10px] text-zinc-500 truncate">{sq.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[9px] font-bold ${difficultyMeta(sq.difficulty).color}`}>
                                {"★".repeat(difficultyMeta(sq.difficulty).stars)} {difficultyMeta(sq.difficulty).label}
                              </span>
                              <span className="text-[9px] text-zinc-600">+{sq.xp_reward} XP · +{sq.coin_reward} coins</span>
                              {sq.proof_required && <span className="text-[9px] text-amber-400">Proof</span>}
                            </div>
                          </div>
                          <span className="text-ascend-violet text-lg shrink-0">+</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Create quest inline */}
                  {showCreateQuest === goal.id && (
                    <CreateQuestForm
                      defaultCategory={goal.category}
                      onSubmit={(input) => handleCreateQuest(goal.id, input)}
                      onCancel={() => setShowCreateQuest(null)}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-6 mb-3">
            Completed ({completedGoals.length})
          </h3>
          <div className="space-y-2">
            {completedGoals.map((g) => (
              <div key={g.id} className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-3 flex items-center gap-3 opacity-70">
                <span className="text-lg">{g.icon}</span>
                <p className="text-sm font-bold flex-1 line-through">{g.title}</p>
                <span className="text-[10px] font-bold text-emerald-400">✓ +{g.xp_reward} XP</span>
                <button onClick={() => handleDeleteGoal(g.id)} className="text-zinc-600 text-xs active:scale-90 transition-transform">✕</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Standalone quests (no goal) */}
      {allQuests.some((q) => q.goal_id === null) && (
        <>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-6 mb-3">Standalone Quests</h3>
          <div className="space-y-2 mb-4">
            {allQuests.filter((q) => q.goal_id === null).map((q) => (
              <QuestCard
                key={q.id}
                quest={q}
                onComplete={() => handleCompleteQuest(q)}
                onDelete={() => handleDeleteQuest(q.id)}
                onUnlock={() => handleUnlockQuest(q)}
                onActivate={() => handleActivateQuest(q)}
                completing={completingId === q.id}
              />
            ))}
          </div>
        </>
      )}

      {/* Add standalone quest */}
      <button
        onClick={() => { setShowCreateQuest("__standalone"); sounds.buttonPress(); }}
        className="w-full text-xs font-bold text-zinc-400 bg-white/5 border border-white/10 rounded-xl py-3 active:scale-95 transition-transform mb-4"
      >
        + Add Standalone Quest
      </button>
      {showCreateQuest === "__standalone" && (
        <CreateQuestForm
          onSubmit={(input) => handleCreateQuest(null, input)}
          onCancel={() => setShowCreateQuest(null)}
        />
      )}
    </AppShell>
  );
}

// ─── Quest Card ───

function QuestCard({
  quest, onComplete, onDelete, onUnlock, onActivate, completing,
}: {
  quest: Quest;
  onComplete: () => void;
  onDelete: () => void;
  onUnlock: () => void;
  onActivate: () => void;
  completing: boolean;
}) {
  const diff = difficultyMeta(quest.difficulty);
  const isCompleted = quest.status === "completed";
  const isLocked = quest.status === "locked";

  return (
    <div className={`rounded-xl border p-3 transition-all ${isCompleted ? "bg-emerald-500/5 border-emerald-500/15" : isLocked ? "bg-black/20 border-white/5 opacity-50" : "bg-black/20 border-white/5"}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold ${isCompleted ? "line-through text-zinc-500" : "text-zinc-200"}`}>
            {quest.title}
          </p>
          {quest.description && (
            <p className="text-[10px] text-zinc-500 mt-0.5 leading-snug">{quest.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-[9px] font-bold ${diff.color}`}>
              {"★".repeat(diff.stars)} {diff.label}
            </span>
            <span className="text-[9px] text-ascend-gold">+{quest.xp_reward} XP</span>
            <span className="text-[9px] text-zinc-500">+{quest.coin_reward} coins</span>
            {quest.proof_required && (
              <span className="text-[9px] text-amber-400 font-bold">Proof required</span>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {isCompleted ? (
            <div className="size-7 rounded-full bg-emerald-500/20 grid place-items-center text-xs text-emerald-400">✓</div>
          ) : isLocked ? (
            <button onClick={onUnlock} className="text-[10px] font-bold text-zinc-400 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 active:scale-95 transition-transform">
              Unlock
            </button>
          ) : completing ? (
            <div className="size-7 rounded-full border-2 border-ascend-violet/30 border-t-ascend-violet animate-spin" />
          ) : quest.proof_required ? (
            <button onClick={onComplete} className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1.5 active:scale-95 transition-transform">
              Prove
            </button>
          ) : (
            <button onClick={onComplete} className="size-7 rounded-full border-2 border-zinc-700 hover:border-ascend-violet active:scale-90 transition-all" aria-label="Complete" />
          )}
        </div>
        {!isCompleted && (
          <button onClick={onDelete} className="text-zinc-700 text-[10px] active:scale-90 transition-transform shrink-0">✕</button>
        )}
      </div>
      {quest.status === "active" && !isCompleted && (
        <div className="mt-2">
          <span className="text-[9px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">Active</span>
        </div>
      )}
    </div>
  );
}

// ─── Create Goal Form ───

function CreateGoalForm({
  onSubmit, onCancel,
}: {
  onSubmit: (input: {
    title: string; description?: string; category?: string; customCategory?: string;
    deadline?: string; xpReward?: number; icon?: string;
  }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [customCategory, setCustomCategory] = useState("");
  const [deadline, setDeadline] = useState("");
  const [xpReward, setXpReward] = useState(50);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      customCategory: category === "other" ? customCategory.trim() || undefined : undefined,
      deadline: deadline || undefined,
      xpReward,
      icon: categoryIcon(category),
    });
  };

  return (
    <div className="bg-card border border-white/5 rounded-2xl p-4 mb-4 space-y-3 animate-rise-fade">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Goal title..."
        maxLength={60}
        className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ascend-violet"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)..."
        maxLength={200}
        rows={2}
        className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-ascend-violet resize-none"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-ascend-violet"
      >
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
        ))}
      </select>
      {category === "other" && (
        <input
          value={customCategory}
          onChange={(e) => setCustomCategory(e.target.value)}
          placeholder="Enter custom category..."
          maxLength={30}
          className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-ascend-violet animate-rise-fade"
        />
      )}
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-ascend-violet"
        />
        <input
          type="number"
          value={xpReward}
          onChange={(e) => setXpReward(Math.max(0, parseInt(e.target.value) || 0))}
          placeholder="XP"
          className="bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-ascend-violet"
        />
      </div>
      <div className="flex gap-2">
        <button onClick={handleSubmit} className="flex-1 bg-ascend-violet text-white font-bold py-2.5 rounded-xl text-sm active:scale-95 transition-transform">
          Create Goal
        </button>
        <button onClick={onCancel} className="text-xs font-bold text-zinc-400 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 active:scale-95 transition-transform">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Create Quest Form ───

function CreateQuestForm({
  defaultCategory, onSubmit, onCancel,
}: {
  defaultCategory?: string;
  onSubmit: (input: {
    title: string; description?: string; category?: string; customCategory?: string;
    difficulty?: Difficulty; xpReward?: number; coinReward?: number;
    requirements?: string; proofRequired?: boolean; proofType?: string;
  }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(defaultCategory ?? "general");
  const [customCategory, setCustomCategory] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [xpReward, setXpReward] = useState(30);
  const [coinReward, setCoinReward] = useState(5);
  const [requirements, setRequirements] = useState("");
  const [proofRequired, setProofRequired] = useState(false);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      customCategory: category === "other" ? customCategory.trim() || undefined : undefined,
      difficulty,
      xpReward,
      coinReward,
      requirements: requirements.trim() || undefined,
      proofRequired,
      proofType: proofRequired ? "text" : undefined,
    });
  };

  return (
    <div className="bg-card border border-white/5 rounded-2xl p-4 space-y-3 animate-rise-fade">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Quest title..."
        maxLength={60}
        className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-ascend-violet"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)..."
        maxLength={200}
        rows={2}
        className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-ascend-violet resize-none"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-ascend-violet"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          className="bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-ascend-violet"
        >
          {DIFFICULTIES.map((d) => (
            <option key={d.value} value={d.value}>{"★".repeat(d.stars)} {d.label}</option>
          ))}
        </select>
      </div>
      {category === "other" && (
        <input
          value={customCategory}
          onChange={(e) => setCustomCategory(e.target.value)}
          placeholder="Enter custom category..."
          maxLength={30}
          className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-ascend-violet animate-rise-fade"
        />
      )}
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          value={xpReward}
          onChange={(e) => setXpReward(Math.max(0, parseInt(e.target.value) || 0))}
          placeholder="XP"
          className="bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-ascend-violet"
        />
        <input
          type="number"
          value={coinReward}
          onChange={(e) => setCoinReward(Math.max(0, parseInt(e.target.value) || 0))}
          placeholder="Coins"
          className="bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-ascend-violet"
        />
      </div>
      <textarea
        value={requirements}
        onChange={(e) => setRequirements(e.target.value)}
        placeholder="Requirements (optional)..."
        maxLength={200}
        rows={2}
        className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-ascend-violet resize-none"
      />
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={proofRequired}
          onChange={(e) => setProofRequired(e.target.checked)}
          className="accent-ascend-violet"
        />
        Requires proof to complete
      </label>
      <div className="flex gap-2">
        <button onClick={handleSubmit} className="flex-1 bg-ascend-violet text-white font-bold py-2.5 rounded-xl text-sm active:scale-95 transition-transform">
          Create Quest
        </button>
        <button onClick={onCancel} className="text-xs font-bold text-zinc-400 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 active:scale-95 transition-transform">
          Cancel
        </button>
      </div>
    </div>
  );
}
