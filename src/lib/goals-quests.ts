import { supabase } from "./supabase";
import { setState } from "./ascend-store";

export type GoalStatus = "active" | "completed" | "abandoned";
export type QuestStatus = "locked" | "available" | "active" | "completed";
export type Difficulty = "easy" | "medium" | "hard" | "extreme";
export type ProofType = "photo" | "text" | "timer" | null;

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  icon: string;
  category: string;
  target_value: number;
  current_value: number;
  deadline: string | null;
  xp_reward: number;
  completed: boolean;
  completed_at: string | null;
  status: GoalStatus;
  created_at: string;
};

export type Quest = {
  id: string;
  user_id: string;
  goal_id: string | null;
  title: string;
  description: string | null;
  category: string;
  custom_category: string | null;
  difficulty: Difficulty;
  xp_reward: number;
  coin_reward: number;
  requirements: string | null;
  proof_required: boolean;
  proof_type: ProofType;
  proof_data: string | null;
  status: QuestStatus;
  completed_at: string | null;
  reward_claimed: boolean;
  created_at: string;
};

export const CATEGORIES = [
  { value: "general", label: "General", icon: "🎯" },
  { value: "athleticism", label: "Athleticism", icon: "🏃" },
  { value: "strength", label: "Strength", icon: "💪" },
  { value: "intelligence", label: "Intelligence", icon: "🧠" },
  { value: "health", label: "Health", icon: "❤️" },
  { value: "discipline", label: "Discipline", icon: "⚡" },
  { value: "social", label: "Social", icon: "🤝" },
  { value: "creativity", label: "Creativity", icon: "🎨" },
  { value: "adventure", label: "Adventure", icon: "🌎" },
  { value: "other", label: "Other", icon: "✨" },
] as const;

export const DIFFICULTIES = [
  { value: "easy", label: "Easy", xp: 20, coins: 3, stars: 1, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  { value: "medium", label: "Medium", xp: 40, coins: 6, stars: 2, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/30" },
  { value: "hard", label: "Hard", xp: 80, coins: 12, stars: 3, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  { value: "extreme", label: "Extreme", xp: 150, coins: 20, stars: 4, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30" },
] as const;

export function difficultyMeta(d: Difficulty) {
  return DIFFICULTIES.find((x) => x.value === d) ?? DIFFICULTIES[1];
}

export function categoryIcon(cat: string): string {
  return CATEGORIES.find((c) => c.value === cat)?.icon ?? "🎯";
}

export function categoryLabel(cat: string, custom?: string | null): string {
  if (cat === "other" && custom) return custom;
  return CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

// ─── Goals ───

export async function fetchGoals(userId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from("user_goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Goal[]) ?? [];
}

export async function createGoal(
  userId: string,
  input: {
    title: string;
    description?: string;
    icon?: string;
    category?: string;
    target_value?: number;
    deadline?: string;
    xp_reward?: number;
  }
): Promise<Goal> {
  const { data, error } = await supabase
    .from("user_goals")
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description ?? null,
      icon: input.icon ?? "🎯",
      category: input.category ?? "general",
      target_value: input.target_value ?? 100,
      deadline: input.deadline || null,
      xp_reward: input.xp_reward ?? 50,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Goal;
}

export async function updateGoal(
  id: string,
  fields: Partial<Pick<Goal, "title" | "description" | "icon" | "category" | "deadline" | "xp_reward" | "status">>
): Promise<void> {
  const { error } = await supabase.from("user_goals").update(fields).eq("id", id);
  if (error) throw error;
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from("user_goals").delete().eq("id", id);
  if (error) throw error;
}

// ─── Quests ───

export async function fetchQuests(userId: string, goalId?: string): Promise<Quest[]> {
  let q = supabase.from("user_quests").select("*").eq("user_id", userId);
  if (goalId) q = q.eq("goal_id", goalId);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Quest[]) ?? [];
}

export async function createQuest(
  userId: string,
  input: {
    goal_id?: string | null;
    title: string;
    description?: string;
    category?: string;
    custom_category?: string;
    difficulty?: Difficulty;
    xp_reward?: number;
    coin_reward?: number;
    requirements?: string;
    proof_required?: boolean;
    proof_type?: ProofType;
    status?: QuestStatus;
  }
): Promise<Quest> {
  const { data, error } = await supabase
    .from("user_quests")
    .insert({
      user_id: userId,
      goal_id: input.goal_id ?? null,
      title: input.title,
      description: input.description ?? null,
      category: input.category ?? "general",
      custom_category: input.custom_category ?? null,
      difficulty: input.difficulty ?? "medium",
      xp_reward: input.xp_reward ?? 30,
      coin_reward: input.coin_reward ?? 5,
      requirements: input.requirements ?? null,
      proof_required: input.proof_required ?? false,
      proof_type: input.proof_type ?? null,
      status: input.status ?? "available",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Quest;
}

export async function updateQuestStatus(
  id: string,
  status: QuestStatus,
  proofData?: string
): Promise<Quest> {
  const update: Record<string, unknown> = { status };
  if (proofData !== undefined) update.proof_data = proofData;
  const { data, error } = await supabase
    .from("user_quests")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Quest;
}

export async function deleteQuest(id: string): Promise<void> {
  const { error } = await supabase.from("user_quests").delete().eq("id", id);
  if (error) throw error;
}

// ─── Quest completion with reward integration ───

export async function completeQuestWithRewards(
  quest: Quest
): Promise<{ success: boolean; error?: string; quest?: Quest }> {
  if (quest.status === "completed") {
    return { success: false, error: "This quest is already completed." };
  }
  if (quest.proof_required && !quest.proof_data) {
    return { success: false, error: "This quest requires proof before completion." };
  }

  try {
    const updated = await updateQuestStatus(quest.id, "completed", quest.proof_data);

    setState((s) => {
      const today = new Date().toISOString().slice(0, 10);
      const newStreak = s.lastActiveDate === today ? s.streak : s.streak + 1;
      const longestStreak = Math.max(s.longestStreak, newStreak);
      const statKey = quest.category as keyof typeof s.stats;
      const validStat = statKey in s.stats;
      const newStats = validStat
        ? { ...s.stats, [statKey]: Math.min(100, s.stats[statKey] + 2) }
        : s.stats;

      return {
        ...s,
        xp: s.xp + quest.xp_reward,
        xpThisWeek: s.xpThisWeek + quest.xp_reward,
        strideScore: Math.min(100, s.strideScore + Math.max(0.2, quest.xp_reward / 80)),
        coins: s.coins + quest.coin_reward,
        completedCount: s.completedCount + 1,
        streak: newStreak,
        longestStreak,
        lastActiveDate: today,
        stats: newStats,
      };
    });

    return { success: true, quest: updated };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to complete quest.";
    return { success: false, error: message };
  }
}

// ─── Goal assistance: suggested quests ───

export type SuggestedQuest = {
  title: string;
  description: string;
  difficulty: Difficulty;
  xp_reward: number;
  coin_reward: number;
  category: string;
  proof_required: boolean;
  proof_type: ProofType;
};

const SUGGESTED_QUEST_TEMPLATES: Record<string, SuggestedQuest[]> = {
  general: [
    { title: "Define your why", description: "Write down why this goal matters to you.", difficulty: "easy", xp_reward: 20, coin_reward: 3, category: "general", proof_required: false, proof_type: null },
    { title: "Break it into 3 milestones", description: "List 3 key milestones toward this goal.", difficulty: "easy", xp_reward: 25, coin_reward: 4, category: "general", proof_required: false, proof_type: null },
    { title: "Weekly review", description: "Review your progress and adjust your plan.", difficulty: "easy", xp_reward: 20, coin_reward: 3, category: "general", proof_required: false, proof_type: null },
    { title: "Share your goal", description: "Tell a friend or accountability partner about this goal.", difficulty: "medium", xp_reward: 40, coin_reward: 6, category: "social", proof_required: false, proof_type: null },
  ],
  athleticism: [
    { title: "30-minute walk", description: "Go for a 30-minute walk outdoors.", difficulty: "easy", xp_reward: 20, coin_reward: 3, category: "athleticism", proof_required: true, proof_type: "timer" },
    { title: "Bodyweight circuit", description: "Complete 3 rounds of pushups, squats, and planks.", difficulty: "medium", xp_reward: 40, coin_reward: 6, category: "athleticism", proof_required: true, proof_type: "photo" },
    { title: "Run 5km", description: "Run or jog 5km without stopping.", difficulty: "hard", xp_reward: 80, coin_reward: 12, category: "athleticism", proof_required: true, proof_type: "photo" },
    { title: "Sport-specific drill", description: "Practice a skill specific to your sport for 30 minutes.", difficulty: "medium", xp_reward: 40, coin_reward: 6, category: "athleticism", proof_required: true, proof_type: "timer" },
  ],
  strength: [
    { title: "50 pushups", description: "Complete 50 pushups in one day.", difficulty: "medium", xp_reward: 40, coin_reward: 6, category: "strength", proof_required: true, proof_type: "photo" },
    { title: "100 squats", description: "Complete 100 squats, split as needed.", difficulty: "medium", xp_reward: 40, coin_reward: 6, category: "strength", proof_required: true, proof_type: "photo" },
    { title: "2-minute plank", description: "Hold a plank for 2 minutes.", difficulty: "hard", xp_reward: 80, coin_reward: 12, category: "strength", proof_required: true, proof_type: "timer" },
  ],
  intelligence: [
    { title: "Read for 30 minutes", description: "Read a book for 30 minutes.", difficulty: "easy", xp_reward: 25, coin_reward: 4, category: "intelligence", proof_required: false, proof_type: null },
    { title: "Learn 10 new words", description: "Learn 10 words in a new language.", difficulty: "medium", xp_reward: 40, coin_reward: 6, category: "intelligence", proof_required: false, proof_type: null },
    { title: "Deep work session", description: "45 minutes of focused, phone-free work.", difficulty: "hard", xp_reward: 80, coin_reward: 12, category: "intelligence", proof_required: true, proof_type: "timer" },
    { title: "Watch an educational video", description: "Watch a 20+ minute educational video and take notes.", difficulty: "easy", xp_reward: 25, coin_reward: 4, category: "intelligence", proof_required: false, proof_type: null },
  ],
  health: [
    { title: "Drink 2L of water", description: "Drink at least 2 liters of water today.", difficulty: "easy", xp_reward: 20, coin_reward: 3, category: "health", proof_required: false, proof_type: null },
    { title: "Sleep before 11pm", description: "Be in bed before 11pm for a full 8 hours.", difficulty: "medium", xp_reward: 40, coin_reward: 6, category: "health", proof_required: false, proof_type: null },
    { title: "Eat clean for a day", description: "No processed food for the entire day.", difficulty: "medium", xp_reward: 40, coin_reward: 6, category: "health", proof_required: false, proof_type: null },
    { title: "10-minute meditation", description: "Meditate for 10 minutes.", difficulty: "easy", xp_reward: 20, coin_reward: 3, category: "health", proof_required: true, proof_type: "timer" },
  ],
  discipline: [
    { title: "Wake up at the same time", description: "Wake up at your chosen time for 3 days straight.", difficulty: "medium", xp_reward: 40, coin_reward: 6, category: "discipline", proof_required: false, proof_type: null },
    { title: "No sugar today", description: "No sweets or sugary drinks for the entire day.", difficulty: "medium", xp_reward: 40, coin_reward: 6, category: "discipline", proof_required: false, proof_type: null },
    { title: "Cold shower", description: "Take a cold shower to start your day.", difficulty: "medium", xp_reward: 40, coin_reward: 6, category: "discipline", proof_required: false, proof_type: null },
    { title: "Plan tomorrow tonight", description: "Write your top 3 priorities for the next day.", difficulty: "easy", xp_reward: 20, coin_reward: 3, category: "discipline", proof_required: false, proof_type: null },
  ],
  social: [
    { title: "Call someone you love", description: "Have a real phone call with a friend or family member.", difficulty: "easy", xp_reward: 30, coin_reward: 5, category: "social", proof_required: false, proof_type: null },
    { title: "Compliment 3 people", description: "Give genuine compliments to 3 people.", difficulty: "easy", xp_reward: 30, coin_reward: 5, category: "social", proof_required: false, proof_type: null },
    { title: "Attend a social event", description: "Go to a gathering, meetup, or event.", difficulty: "hard", xp_reward: 80, coin_reward: 12, category: "social", proof_required: true, proof_type: "photo" },
  ],
  creativity: [
    { title: "Sketch for 10 minutes", description: "Draw anything for 10 minutes.", difficulty: "easy", xp_reward: 25, coin_reward: 4, category: "creativity", proof_required: true, proof_type: "photo" },
    { title: "Write 500 words", description: "Write 500 words on any topic.", difficulty: "medium", xp_reward: 40, coin_reward: 6, category: "creativity", proof_required: false, proof_type: null },
    { title: "Practice an instrument", description: "Practice an instrument for 20 minutes.", difficulty: "medium", xp_reward: 40, coin_reward: 6, category: "creativity", proof_required: true, proof_type: "timer" },
    { title: "Take 10 photos", description: "Take 10 creative photos of your surroundings.", difficulty: "easy", xp_reward: 30, coin_reward: 5, category: "creativity", proof_required: true, proof_type: "photo" },
  ],
  adventure: [
    { title: "Explore a new place", description: "Visit somewhere you've never been.", difficulty: "medium", xp_reward: 60, coin_reward: 8, category: "adventure", proof_required: true, proof_type: "photo" },
    { title: "Try a new activity", description: "Do something you've never done before.", difficulty: "hard", xp_reward: 80, coin_reward: 12, category: "adventure", proof_required: true, proof_type: "photo" },
    { title: "Watch the sunrise", description: "Wake up early and watch the sunrise.", difficulty: "hard", xp_reward: 100, coin_reward: 15, category: "adventure", proof_required: true, proof_type: "photo" },
  ],
  other: [
    { title: "Define your first step", description: "Write the very first action you need to take.", difficulty: "easy", xp_reward: 20, coin_reward: 3, category: "general", proof_required: false, proof_type: null },
    { title: "Set a deadline", description: "Give this goal a specific deadline.", difficulty: "easy", xp_reward: 20, coin_reward: 3, category: "general", proof_required: false, proof_type: null },
    { title: "Weekly check-in", description: "Review your progress once a week.", difficulty: "easy", xp_reward: 25, coin_reward: 4, category: "general", proof_required: false, proof_type: null },
  ],
};

export function getSuggestedQuests(category: string): SuggestedQuest[] {
  return SUGGESTED_QUEST_TEMPLATES[category] ?? SUGGESTED_QUEST_TEMPLATES.general;
}

export type GoalMilestone = {
  label: string;
  done: boolean;
  questId?: string;
};

export function getMilestones(quests: Quest[]): GoalMilestone[] {
  return quests.map((q) => ({
    label: q.title,
    done: q.status === "completed",
    questId: q.id,
  }));
}

export function getGoalProgress(quests: Quest[]): number {
  if (quests.length === 0) return 0;
  const completed = quests.filter((q) => q.status === "completed").length;
  return Math.round((completed / quests.length) * 100);
}

export function getNextSteps(quests: Quest[]): Quest[] {
  return quests
    .filter((q) => q.status === "available" || q.status === "active")
    .slice(0, 3);
}
