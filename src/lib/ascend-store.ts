import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "./supabase";

export type StatKey = "strength" | "intelligence" | "health" | "discipline" | "social" | "creativity" | "adventure" | "athleticism";

export const STAT_META: Record<StatKey, { label: string; icon: string; color: string }> = {
  strength: { label: "Strength", icon: "💪", color: "#ef4444" },
  intelligence: { label: "Intelligence", icon: "🧠", color: "#3b82f6" },
  health: { label: "Health", icon: "❤️", color: "#ec4899" },
  discipline: { label: "Discipline", icon: "⚡", color: "#f59e0b" },
  social: { label: "Social", icon: "🤝", color: "#06b6d4" },
  creativity: { label: "Creativity", icon: "🎨", color: "#a855f7" },
  adventure: { label: "Adventure", icon: "🌎", color: "#10b981" },
  athleticism: { label: "Athleticism", icon: "⚽", color: "#f97316" },
};

export type Difficulty = "easy" | "medium" | "hard" | "extreme";

export const DIFFICULTY_META: Record<Difficulty, { label: string; xpRange: [number, number]; color: string; stars: number }> = {
  easy: { label: "Easy", xpRange: [15, 30], color: "text-emerald-400", stars: 1 },
  medium: { label: "Medium", xpRange: [35, 60], color: "text-sky-400", stars: 2 },
  hard: { label: "Hard", xpRange: [70, 120], color: "text-amber-400", stars: 3 },
  extreme: { label: "Extreme", xpRange: [130, 250], color: "text-rose-400", stars: 4 },
};

export type Quest = { id: string; title: string; subtitle: string; icon: string; xp: number; stat: StatKey; done: boolean; createdAt: number; difficulty?: Difficulty; source?: "daily" | "side" | "habit" | "hobby" | "custom"; };
export type JournalEntry = { id: string; date: string; mood: "great" | "ok" | "bad"; note: string; win: string; photo?: string | null; reflection?: string | null; };

// ─── Achievement definitions ───
export type AchievementDef = { id: string; label: string; icon: string; tier: "bronze" | "silver" | "gold" | "diamond"; desc: string; check: (s: AscendState) => boolean };

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_quest", label: "First Quest", icon: "🥉", tier: "bronze", desc: "Complete your first quest", check: (s) => s.completedCount >= 1 },
  { id: "quest_10", label: "Getting Started", icon: "⚔️", tier: "bronze", desc: "Complete 10 quests", check: (s) => s.completedCount >= 10 },
  { id: "streak_7", label: "7 Day Streak", icon: "🥈", tier: "silver", desc: "Maintain a 7-day streak", check: (s) => s.streak >= 7 },
  { id: "streak_30", label: "Unstoppable", icon: "🔥", tier: "gold", desc: "Maintain a 30-day streak", check: (s) => s.streak >= 30 },
  { id: "quest_50", label: "Half Century", icon: "🥈", tier: "silver", desc: "Complete 50 quests", check: (s) => s.completedCount >= 50 },
  { id: "quest_100", label: "100 Quests", icon: "🥇", tier: "gold", desc: "Complete 100 quests", check: (s) => s.completedCount >= 100 },
  { id: "level_10", label: "Rising Star", icon: "🌟", tier: "gold", desc: "Reach Level 10", check: (s) => levelFromXp(s.xp).level >= 10 },
  { id: "level_25", label: "Veteran", icon: "⭐", tier: "gold", desc: "Reach Level 25", check: (s) => levelFromXp(s.xp).level >= 25 },
  { id: "level_50", label: "Level 50", icon: "🏆", tier: "diamond", desc: "Reach Level 50", check: (s) => levelFromXp(s.xp).level >= 50 },
  { id: "score_80", label: "Ascended", icon: "💎", tier: "diamond", desc: "Reach a Life Score of 80+", check: (s) => s.strideScore >= 80 },
  { id: "journal_7", label: "Reflective Soul", icon: "📖", tier: "silver", desc: "Write 7 journal entries", check: (s) => s.journal.length >= 7 },
  { id: "journal_30", label: "Chronicler", icon: "📚", tier: "gold", desc: "Write 30 journal entries", check: (s) => s.journal.length >= 30 },
  { id: "adventure_10", label: "Adventurer", icon: "🌎", tier: "gold", desc: "Complete 10 adventure quests", check: (s) => s.completedCount >= 10 && s.stats.adventure >= 50 },
];

export function getUnlockedAchievements(s: AscendState): string[] {
  return ACHIEVEMENTS.filter((a) => a.check(s)).map((a) => a.id);
}

export type Mood = "great" | "good" | "okay" | "low";

export type AdventureEntry = { id: string; title: string; icon: string; stat: StatKey; xp: number; date: string; difficulty: Difficulty };

export type ShopCategory = "frame" | "avatar" | "theme" | "badge";
export type ShopItem = { id: string; name: string; category: ShopCategory; price: number; icon: string; desc: string; rarity: "common" | "rare" | "epic" | "legendary" };

export const SHOP_ITEMS: ShopItem[] = [
  // Frames
  { id: "frame_gold", name: "Gold Frame", category: "frame", price: 200, icon: "🟡", desc: "A golden border for your profile", rarity: "rare" },
  { id: "frame_neon", name: "Neon Frame", category: "frame", price: 350, icon: "💜", desc: "Glowing violet border", rarity: "epic" },
  { id: "frame_fire", name: "Inferno Frame", category: "frame", price: 500, icon: "🔥", desc: "Blazing flame border", rarity: "legendary" },
  { id: "frame_ice", name: "Frost Frame", category: "frame", price: 300, icon: "❄️", desc: "Crystalline ice border", rarity: "epic" },
  // Avatar items
  { id: "avatar_crown", name: "Golden Crown", category: "avatar", price: 400, icon: "👑", desc: "Rule your kingdom", rarity: "epic" },
  { id: "avatar_shades", name: "Cool Shades", category: "avatar", price: 150, icon: "🕶️", desc: "Too cool for school", rarity: "rare" },
  { id: "avatar_halo", name: "Halo", category: "avatar", price: 600, icon: "😇", desc: "Angel status", rarity: "legendary" },
  { id: "avatar_sword", name: "Epic Sword", category: "avatar", price: 250, icon: "⚔️", desc: "Wield the blade", rarity: "rare" },
  { id: "avatar_wings", name: "Phoenix Wings", category: "avatar", price: 700, icon: "🦅", desc: "Rise from the ashes", rarity: "legendary" },
  // Themes
  { id: "theme_emerald", name: "Emerald Theme", category: "theme", price: 300, icon: "💚", desc: "Deep green aesthetic", rarity: "epic" },
  { id: "theme_sunset", name: "Sunset Theme", category: "theme", price: 250, icon: "🌅", desc: "Warm orange glow", rarity: "rare" },
  { id: "theme_ocean", name: "Ocean Theme", category: "theme", price: 250, icon: "🌊", desc: "Deep blue waves", rarity: "rare" },
  { id: "theme_aurora", name: "Aurora Theme", category: "theme", price: 500, icon: "🌌", desc: "Northern lights", rarity: "legendary" },
  // Badges
  { id: "badge_warrior", name: "Warrior Badge", category: "badge", price: 200, icon: "🛡️", desc: "Mark of the fighter", rarity: "rare" },
  { id: "badge_scholar", name: "Scholar Badge", category: "badge", price: 200, icon: "🎓", desc: "Mark of the mind", rarity: "rare" },
  { id: "badge_explorer", name: "Explorer Badge", category: "badge", price: 300, icon: "🧭", desc: "Mark of the wanderer", rarity: "epic" },
  { id: "badge_champion", name: "Champion Badge", category: "badge", price: 500, icon: "🏆", desc: "Mark of the victor", rarity: "legendary" },
];

export const RARITY_COLORS: Record<string, string> = {
  common: "border-zinc-500/40 from-zinc-500/10 to-zinc-700/5",
  rare: "border-sky-500/40 from-sky-500/10 to-sky-700/5",
  epic: "border-ascend-violet/40 from-ascend-violet/10 to-ascend-fuchsia/5",
  legendary: "border-ascend-gold/40 from-ascend-gold/10 to-amber-700/5",
};

export function getShopItemsByCategory(cat: ShopCategory): ShopItem[] {
  return SHOP_ITEMS.filter((i) => i.category === cat);
}

export type LevelHistoryEntry = { level: number; date: string; xp: number };

export type AscendState = {
  onboarded: boolean; name: string; avatar: string | null; goals: string[]; interests: string[];
  stats: Record<StatKey, number>; xp: number; xpThisWeek: number; xpWeekStart: string | null; strideScore: number; tier: string;
  startingHeadline: string; startingReason: string; streak: number; longestStreak: number; lastActiveDate: string | null;
  freezeTokens: number; lastFreezeDate: string | null;
  dailyQuests: Quest[]; completedCount: number; achievements: string[]; journal: JournalEntry[];
  theme: string; lastQuestDate: string | null; seenQuestIds: string[];
  mood: Mood | null; moodDate: string | null;
  adventures: AdventureEntry[];
  lastRecapWeek: string | null;
  coins: number; ownedItems: string[]; equippedItems: Record<string, string>;
  levelHistory: LevelHistoryEntry[];
};

const KEY = "ascend-state-v5";

// ─── Level rewards ───
export const LEVEL_REWARDS: Record<number, { icon: string; name: string }> = {
  2: { icon: "💧", name: "Hydration Master" },
  3: { icon: "📚", name: "Knowledge Seeker" },
  5: { icon: "🔥", name: "Streak Warrior" },
  7: { icon: "⚡", name: "Discipline Adept" },
  10: { icon: "🌟", name: "Rising Star" },
  15: { icon: "🛡️", name: "Iron Will" },
  20: { icon: "👑", name: "Ascendant" },
  25: { icon: "💎", name: "Diamond Soul" },
  30: { icon: "🏆", name: "Champion" },
  50: { icon: "⭐", name: "Legend" },
};

export function getLevelReward(level: number): { icon: string; name: string } | null {
  return LEVEL_REWARDS[level] ?? null;
}

// ─── Titles system ───
export type TitleDef = { id: string; label: string; icon: string; minLevel: number; desc: string };

export const TITLES: TitleDef[] = [
  { id: "beginner", label: "Beginner", icon: "🌱", minLevel: 1, desc: "Every legend starts somewhere" },
  { id: "consistent", label: "Consistent", icon: "🔥", minLevel: 10, desc: "10 days of showing up" },
  { id: "disciplined", label: "Disciplined", icon: "⚡", minLevel: 25, desc: "Mastery of self" },
  { id: "elite", label: "Elite", icon: "🏆", minLevel: 50, desc: "Top 1% dedication" },
  { id: "legend", label: "Legend", icon: "🌎", minLevel: 100, desc: "Among the greatest" },
];

export function getUnlockedTitles(xp: number): TitleDef[] {
  const level = levelFromXp(xp).level;
  return TITLES.filter((t) => level >= t.minLevel);
}

export function getHighestTitle(xp: number): TitleDef {
  const unlocked = getUnlockedTitles(xp);
  return unlocked[unlocked.length - 1] ?? TITLES[0];
}

export function getNextTitle(xp: number): TitleDef | null {
  const level = levelFromXp(xp).level;
  return TITLES.find((t) => t.minLevel > level) ?? null;
}

// ─── Daily quest pool ───
const DAILY_POOL: Omit<Quest, "id" | "done" | "createdAt">[] = [
  { title: "Stay Hydrated", subtitle: "Drink 2L of water", icon: "💧", xp: 25, stat: "health", difficulty: "easy", source: "daily" },
  { title: "Expand Mind", subtitle: "Read for 20 minutes", icon: "📚", xp: 20, stat: "intelligence", difficulty: "easy", source: "daily" },
  { title: "Move Your Body", subtitle: "Workout for 30 min", icon: "🏋️", xp: 40, stat: "strength", difficulty: "medium", source: "daily" },
  { title: "Step Outside", subtitle: "Walk in fresh air", icon: "🌳", xp: 15, stat: "athleticism", difficulty: "easy", source: "daily" },
  { title: "Reflect", subtitle: "Journal one thought", icon: "📖", xp: 15, stat: "discipline", difficulty: "easy", source: "daily" },
  { title: "Stretch It Out", subtitle: "10 min full body stretch", icon: "🤸", xp: 15, stat: "health", difficulty: "easy", source: "daily" },
  { title: "Practice a Skill", subtitle: "15 min focused practice", icon: "🎯", xp: 30, stat: "creativity", difficulty: "medium", source: "daily" },
  { title: "Eat Clean Today", subtitle: "No processed food", icon: "🥗", xp: 35, stat: "health", difficulty: "medium", source: "daily" },
  { title: "Meditate", subtitle: "10 min of stillness", icon: "🧘", xp: 20, stat: "discipline", difficulty: "easy", source: "daily" },
  { title: "Sleep Before 11pm", subtitle: "Full 8 hours", icon: "😴", xp: 25, stat: "health", difficulty: "easy", source: "daily" },
  { title: "No Sugar Today", subtitle: "Cut the sweet stuff", icon: "🚫", xp: 30, stat: "discipline", difficulty: "medium", source: "daily" },
  { title: "Learn 5 New Words", subtitle: "In any language", icon: "🗣️", xp: 20, stat: "intelligence", difficulty: "easy", source: "daily" },
  { title: "Cold Shower", subtitle: "Start the day sharp", icon: "🚿", xp: 25, stat: "discipline", difficulty: "medium", source: "daily" },
  { title: "Call Someone You Love", subtitle: "A real conversation", icon: "📞", xp: 30, stat: "social", difficulty: "easy", source: "daily" },
  { title: "Plan Tomorrow", subtitle: "Write your top 3 goals", icon: "📋", xp: 20, stat: "discipline", difficulty: "easy", source: "daily" },
  { title: "Take the Stairs", subtitle: "Skip the elevator all day", icon: "🪜", xp: 15, stat: "athleticism", difficulty: "easy", source: "daily" },
  { title: "Deep Work Session", subtitle: "45 min no phone", icon: "🔋", xp: 40, stat: "intelligence", difficulty: "medium", source: "daily" },
  { title: "Express Gratitude", subtitle: "Write 3 things you're grateful for", icon: "🙏", xp: 15, stat: "social", difficulty: "easy", source: "daily" },
  { title: "Declutter One Space", subtitle: "Desk, shelf, or drawer", icon: "🧹", xp: 20, stat: "discipline", difficulty: "easy", source: "daily" },
  { title: "60 Second Plank", subtitle: "Core of steel", icon: "🔥", xp: 20, stat: "strength", difficulty: "easy", source: "daily" },
];

// ─── Side quest pool (with interest matching) ───
type SideQuestTemplate = { title: string; subtitle: string; icon: string; xp: number; stat: StatKey; difficulty: Difficulty; interests?: string[] };
const SIDE_QUEST_POOL: SideQuestTemplate[] = [
  { title: "Watch Sunrise", subtitle: "Be up before the sun", icon: "🌅", xp: 100, stat: "discipline", difficulty: "hard", interests: ["discipline", "mindfulness"] },
  { title: "Visit a New Park", subtitle: "Somewhere unfamiliar", icon: "🌳", xp: 60, stat: "athleticism", difficulty: "medium", interests: ["adventure", "outdoors", "fitness"] },
  { title: "Take 10 Photos", subtitle: "Frame what others miss", icon: "📷", xp: 40, stat: "creativity", difficulty: "easy", interests: ["creativity", "photography", "art"] },
  { title: "Ride 10km", subtitle: "Any bike, any route", icon: "🚴", xp: 80, stat: "athleticism", difficulty: "hard", interests: ["fitness", "outdoors", "adventure"] },
  { title: "Finish a Book", subtitle: "Last chapter counts", icon: "📚", xp: 150, stat: "intelligence", difficulty: "extreme", interests: ["reading", "learning", "knowledge"] },
  { title: "Cook Dinner From Scratch", subtitle: "No shortcuts", icon: "🍳", xp: 50, stat: "creativity", difficulty: "medium", interests: ["cooking", "creativity", "health"] },
  { title: "50 Free Kicks", subtitle: "Weak foot only", icon: "⚽", xp: 45, stat: "athleticism", difficulty: "medium", interests: ["sports", "soccer", "fitness"] },
  { title: "Talk to a Stranger", subtitle: "One real conversation", icon: "🎤", xp: 60, stat: "social", difficulty: "medium", interests: ["social", "confidence", "communication"] },
  { title: "Watch the Sunset", subtitle: "Phone stays in pocket", icon: "🌇", xp: 40, stat: "discipline", difficulty: "easy", interests: ["mindfulness", "discipline"] },
  { title: "Try a New Café", subtitle: "One you've never been to", icon: "☕", xp: 35, stat: "social", difficulty: "easy", interests: ["social", "adventure", "food"] },
  { title: "Learn 5 Words", subtitle: "In a new language", icon: "🗣️", xp: 30, stat: "intelligence", difficulty: "easy", interests: ["learning", "languages", "knowledge"] },
  { title: "Compliment 3 People", subtitle: "Mean every one", icon: "💬", xp: 40, stat: "social", difficulty: "easy", interests: ["social", "kindness", "confidence"] },
  { title: "100 Pushups", subtitle: "Split across the day", icon: "🔥", xp: 80, stat: "strength", difficulty: "hard", interests: ["fitness", "strength", "exercise"] },
  { title: "Explore a New Street", subtitle: "Go left instead of right", icon: "🗺️", xp: 30, stat: "athleticism", difficulty: "easy", interests: ["adventure", "outdoors", "exploration"] },
  { title: "Read Outside", subtitle: "One chapter under the sky", icon: "🌿", xp: 25, stat: "intelligence", difficulty: "easy", interests: ["reading", "outdoors", "learning"] },
  { title: "Write a Letter to Future You", subtitle: "Seal it. Open in a year.", icon: "✉️", xp: 60, stat: "intelligence", difficulty: "medium", interests: ["writing", "reflection", "mindfulness"] },
  { title: "Master a Weird Skill", subtitle: "Juggle. Whistle. Yo-yo.", icon: "🎯", xp: 100, stat: "discipline", difficulty: "hard", interests: ["skills", "learning", "creativity"] },
  { title: "Cold Water Face Dunk", subtitle: "30 seconds. Wake up.", icon: "🧊", xp: 40, stat: "discipline", difficulty: "medium", interests: ["discipline", "mindfulness", "health"] },
  { title: "Dance Like Nobody's Watching", subtitle: "For one whole song", icon: "💃", xp: 35, stat: "creativity", difficulty: "easy", interests: ["creativity", "fun", "music"] },
  { title: "Build a Fort", subtitle: "Blankets. Pillows. Pride.", icon: "🏰", xp: 50, stat: "creativity", difficulty: "medium", interests: ["creativity", "fun", "play"] },
  { title: "Climb Something", subtitle: "Tree. Rock. Anything.", icon: "🧗", xp: 80, stat: "athleticism", difficulty: "hard", interests: ["fitness", "adventure", "outdoors"] },
  { title: "Learn a Card Trick", subtitle: "Fool one person today", icon: "🃏", xp: 45, stat: "creativity", difficulty: "medium", interests: ["skills", "creativity", "fun"] },
  { title: "Plant Something", subtitle: "Anywhere it'll grow", icon: "🌱", xp: 60, stat: "health", difficulty: "medium", interests: ["nature", "health", "outdoors"] },
  { title: "Stargaze for 15 Minutes", subtitle: "No phone. Just sky.", icon: "✨", xp: 40, stat: "discipline", difficulty: "easy", interests: ["mindfulness", "outdoors", "peace"] },
  { title: "Sketch Your Surroundings", subtitle: "5 min drawing", icon: "✏️", xp: 35, stat: "creativity", difficulty: "easy", interests: ["art", "creativity", "drawing"] },
  { title: "Practice an Instrument", subtitle: "20 min session", icon: "🎹", xp: 40, stat: "creativity", difficulty: "medium", interests: ["music", "creativity", "skills"] },
  { title: "Write a Short Story", subtitle: "500 words. Any topic.", icon: "📝", xp: 70, stat: "intelligence", difficulty: "hard", interests: ["writing", "creativity", "learning"] },
  { title: "Run 5km", subtitle: "Pace doesn't matter", icon: "🏃", xp: 90, stat: "athleticism", difficulty: "hard", interests: ["fitness", "running", "endurance"] },
  { title: "Volunteer for 1 Hour", subtitle: "Help someone in need", icon: "🤝", xp: 80, stat: "social", difficulty: "hard", interests: ["kindness", "social", "community"] },
  { title: "Try a New Recipe", subtitle: "Something you've never made", icon: "👨‍🍳", xp: 45, stat: "creativity", difficulty: "medium", interests: ["cooking", "creativity", "food"] },
  { title: "Do 50 Squats", subtitle: "Form over speed", icon: "🦵", xp: 40, stat: "strength", difficulty: "medium", interests: ["fitness", "strength", "exercise"] },
  { title: "Play Chess", subtitle: "One full match", icon: "♟️", xp: 35, stat: "intelligence", difficulty: "medium", interests: ["games", "strategy", "learning"] },
  { title: "Organize Your Room", subtitle: "Top to bottom", icon: "🧽", xp: 30, stat: "discipline", difficulty: "easy", interests: ["discipline", "organization", "cleaning"] },
  { title: "Write a Poem", subtitle: "About your day", icon: "✍️", xp: 40, stat: "creativity", difficulty: "medium", interests: ["writing", "creativity", "art"] },
  { title: "Stretch for 15 Min", subtitle: "Every muscle group", icon: "🧘", xp: 20, stat: "health", difficulty: "easy", interests: ["health", "flexibility", "mindfulness"] },
];

function pickDailyQuests(count: number, seenIds: string[]): Quest[] {
  const available = DAILY_POOL.filter((q) => !seenIds.includes(q.title));
  const pool = available.length >= count ? available : DAILY_POOL;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((q, i) => ({
    ...q, id: `d${Date.now()}_${i}`, done: false, createdAt: Date.now(),
  }));
}

function generateDailyQuests(seenIds: string[]): Quest[] {
  return pickDailyQuests(5, seenIds);
}

export function generateSideQuest(interests: string[], seenIds: string[], difficulty?: Difficulty): Quest {
  let pool = SIDE_QUEST_POOL.filter((q) => !seenIds.includes(q.title));
  if (pool.length === 0) pool = SIDE_QUEST_POOL;

  // Filter by difficulty if specified
  if (difficulty) {
    const diffFiltered = pool.filter((q) => q.difficulty === difficulty);
    if (diffFiltered.length > 0) pool = diffFiltered;
  }

  // Score quests by interest match
  const interestSet = new Set(interests.map((i) => i.toLowerCase()));
  const scored = pool.map((q) => {
    let score = Math.random();
    if (q.interests) {
      for (const interest of q.interests) {
        if (interestSet.has(interest.toLowerCase())) score += 2;
      }
    }
    return { q, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const pick = scored[0].q;
  return {
    ...pick,
    id: `s${Date.now()}`,
    done: false,
    createdAt: Date.now(),
    source: "side",
  };
}

export function generateRandomQuest(interests: string[], seenIds: string[], mood?: Mood): Quest {
  const difficulties: Difficulty[] = ["easy", "medium", "hard", "extreme"];
  let weights = [0.4, 0.35, 0.2, 0.05];
  if (mood === "low") weights = [0.6, 0.3, 0.08, 0.02];
  else if (mood === "okay") weights = [0.5, 0.35, 0.12, 0.03];
  else if (mood === "great") weights = [0.25, 0.35, 0.3, 0.1];
  const r = Math.random();
  let acc = 0;
  let difficulty: Difficulty = "easy";
  for (let i = 0; i < difficulties.length; i++) {
    acc += weights[i];
    if (r < acc) { difficulty = difficulties[i]; break; }
  }
  return generateSideQuest(interests, seenIds, difficulty);
}

const defaultState: AscendState = {
  onboarded: false, name: "", avatar: null, goals: [], interests: [],
  stats: { strength: 40, intelligence: 45, health: 50, discipline: 40, social: 45, creativity: 40, adventure: 35, athleticism: 40 },
  xp: 0, xpThisWeek: 0, xpWeekStart: null, strideScore: 40, tier: "Beginner", startingHeadline: "", startingReason: "",
  streak: 0, longestStreak: 0, lastActiveDate: null, freezeTokens: 0, lastFreezeDate: null,
  dailyQuests: [], completedCount: 0, achievements: [], journal: [],
  theme: "nebula", lastQuestDate: null, seenQuestIds: [],
  mood: null, moodDate: null, adventures: [], lastRecapWeek: null,
  coins: 0, ownedItems: [], equippedItems: {},
  levelHistory: [],
};

let listeners = new Set<() => void>();
let levelUpListeners = new Set<(level: number, reward: { icon: string; name: string } | null) => void>();
let achievementListeners = new Set<(achievement: { id: string; label: string; icon: string; tier: string }) => void>();
let current: AscendState = defaultState;
export function getState(): AscendState { return current; }
let hydrated = false;
let syncEnabled = false;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

function loadFromStorage(): AscendState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed, stats: { ...defaultState.stats, ...(parsed.stats ?? {}) } };
  } catch { return defaultState; }
}

function persistLocal() {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch {}
}

function emit() { listeners.forEach((l) => l()); }

// ─── Level-up detection ───
export function onLevelUp(cb: (level: number, reward: { icon: string; name: string } | null) => void) {
  levelUpListeners.add(cb);
  return () => { levelUpListeners.delete(cb); };
}

function checkLevelUp(oldXp: number, newXp: number) {
  const oldLevel = levelFromXp(oldXp).level;
  const newLevel = levelFromXp(newXp).level;
  if (newLevel > oldLevel) {
    const reward = getLevelReward(newLevel);
    const entry: LevelHistoryEntry = { level: newLevel, date: new Date().toISOString().slice(0, 10), xp: newXp };
    current = { ...current, levelHistory: [...current.levelHistory, entry] };
    persistLocal();
    emit();
    levelUpListeners.forEach((cb) => cb(newLevel, reward));
  }
}

export function onAchievementUnlocked(cb: (achievement: { id: string; label: string; icon: string; tier: string }) => void) {
  achievementListeners.add(cb);
  return () => { achievementListeners.delete(cb); };
}

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().slice(0, 10);
}

function ensureWeek(s: AscendState): AscendState {
  const weekStart = getWeekStart();
  if (s.xpWeekStart !== weekStart) {
    return { ...s, xpWeekStart: weekStart, xpThisWeek: 0 };
  }
  return s;
}

function checkAchievements(oldState: AscendState, newState: AscendState) {
  const oldUnlocked = new Set(oldState.achievements);
  const newUnlocked = getUnlockedAchievements(newState);
  for (const id of newUnlocked) {
    if (!oldUnlocked.has(id)) {
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) {
        achievementListeners.forEach((cb) => cb({ id: def.id, label: def.label, icon: def.icon, tier: def.tier }));
        if (def.tier === "silver" || def.tier === "gold" || def.tier === "diamond") {
          const tokens = def.tier === "diamond" ? 3 : def.tier === "gold" ? 2 : 1;
          current = { ...current, freezeTokens: current.freezeTokens + tokens };
          persistLocal();
          emit();
        }
      }
    }
  }
}

// ─── Supabase sync ───
function scheduleSync() {
  if (!syncEnabled) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { void syncToSupabase(); }, 1000);
}

async function updateOwnProfile(fields: Record<string, string | null>) {
  const { error } = await supabase.rpc("update_own_profile", fields);
  if (error) throw error;
}

async function syncToSupabase() {
  if (!syncEnabled) return;
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) return;
    const { error } = await supabase.from("user_game_state").upsert({
      user_id: session.user.id,
      xp: current.xp,
      xp_this_week: current.xpThisWeek,
      xp_week_start: current.xpWeekStart,
      stride_score: current.strideScore,
      tier: current.tier,
      stats: current.stats,
      daily_quests: current.dailyQuests,
      completed_count: current.completedCount,
      achievements: current.achievements,
      journal: current.journal,
      streak: current.streak,
      longest_streak: current.longestStreak,
      last_active_date: current.lastActiveDate,
      freeze_tokens: current.freezeTokens,
      mood: current.mood,
      mood_date: current.moodDate,
      adventures: current.adventures,
      last_recap_week: current.lastRecapWeek,
      coins: current.coins,
      owned_items: current.ownedItems,
      equipped_items: current.equippedItems,
      level_history: current.levelHistory,
      onboarded: current.onboarded,
      starting_headline: current.startingHeadline,
      starting_reason: current.startingReason,
      goals: current.goals,
      interests: current.interests,
      theme: current.theme,
      last_quest_date: current.lastQuestDate,
      seen_quest_ids: current.seenQuestIds,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  } catch (error) {
    console.error("Unable to save Ascend progress", error);
  }
}

export async function loadFromSupabase(): Promise<void> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) return;
    const [{ data, error }, { data: profile, error: profileError }] = await Promise.all([
      supabase
      .from("user_game_state")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle(),
      supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", session.user.id)
        .maybeSingle(),
    ]);
    if (error) throw error;
    if (profileError) throw profileError;
    current = {
      ...defaultState,
      onboarded: data.onboarded ?? false,
      name: profile?.display_name ?? "",
      avatar: profile?.avatar_url ?? null,
      goals: data.goals ?? [],
      interests: data.interests ?? [],
      stats: { ...defaultState.stats, ...(data.stats ?? {}) },
      xp: data.xp ?? 0,
      xpThisWeek: data.xp_this_week ?? 0,
      xpWeekStart: data.xp_week_start ?? null,
      strideScore: Number(data.stride_score ?? 40),
      tier: data.tier ?? "Beginner",
      startingHeadline: data.starting_headline ?? "",
      startingReason: data.starting_reason ?? "",
      streak: data.streak ?? 0,
      longestStreak: data.longest_streak ?? 0,
      lastActiveDate: data.last_active_date ?? null,
      freezeTokens: data.freeze_tokens ?? 0,
      mood: (data.mood as Mood | null) ?? null,
      moodDate: data.mood_date ?? null,
      adventures: data.adventures ?? [],
      lastRecapWeek: data.last_recap_week ?? null,
      coins: data.coins ?? 0,
      ownedItems: data.owned_items ?? [],
      equippedItems: data.equipped_items ?? {},
      levelHistory: data.level_history ?? [],
      dailyQuests: data.daily_quests ?? [],
      completedCount: data.completed_count ?? 0,
      achievements: data.achievements ?? [],
      journal: data.journal ?? [],
      theme: data.theme ?? "nebula",
      lastQuestDate: data.last_quest_date ?? null,
      seenQuestIds: data.seen_quest_ids ?? [],
    };
    // Check if daily quests need to be regenerated
    const today = new Date().toISOString().slice(0, 10);
    if (current.lastQuestDate !== today || current.dailyQuests.length === 0) {
      current.dailyQuests = generateDailyQuests(current.seenQuestIds);
      current.lastQuestDate = today;
    }
    persistLocal();
    emit();
  } catch (error) {
    console.error("Unable to load Ascend progress", error);
  }
}

export function enableSync() { syncEnabled = true; }
export function disableSync() { syncEnabled = false; if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; } }

export function setState(updater: (s: AscendState) => AscendState) {
  const oldState = { ...current };
  const oldXp = current.xp;
  current = ensureWeek(updater(current));
  // Auto-update achievements array
  const unlocked = getUnlockedAchievements(current);
  if (unlocked.length !== current.achievements.length) {
    current = { ...current, achievements: unlocked };
  }
  persistLocal();
  emit();
  checkLevelUp(oldXp, current.xp);
  checkAchievements(oldState, current);
  scheduleSync();
}

function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot(): AscendState { return current; }
function getServerSnapshot(): AscendState { return defaultState; }

export function useAscend(): AscendState {
  const [ready, setReady] = useState(hydrated);
  useEffect(() => {
    if (!hydrated) {
      current = loadFromStorage();
      hydrated = true;
      // Check if daily quests need regeneration on first load
      const today = new Date().toISOString().slice(0, 10);
      if (current.lastQuestDate !== today || current.dailyQuests.length === 0) {
        current.dailyQuests = generateDailyQuests(current.seenQuestIds);
        current.lastQuestDate = today;
        persistLocal();
      }
      setReady(true);
      emit();
    }
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function levelFromXp(xp: number): { level: number; progress: number; xpForNext: number; xpInLevel: number } {
  let level = 1; let acc = 0;
  while (true) { const need = 100 + (level - 1) * 20; if (acc + need > xp) return { level, progress: (xp - acc) / need, xpForNext: need, xpInLevel: xp - acc }; acc += need; level++; if (level > 200) return { level: 200, progress: 1, xpForNext: 0, xpInLevel: 0 }; }
}

export function completeQuest(id: string) {
  setState((s) => {
    const quest = s.dailyQuests.find((q) => q.id === id); if (!quest || quest.done) return s;
    const newStats = { ...s.stats, [quest.stat]: Math.min(100, s.stats[quest.stat] + 2) };
    const today = new Date().toISOString().slice(0, 10);
    const newStreak = s.lastActiveDate === today ? s.streak : s.streak + 1;
    const longestStreak = Math.max(s.longestStreak, newStreak);
    const newSeen = [...new Set([...s.seenQuestIds, quest.title])].slice(-50);
    const isAdventure = quest.stat === "adventure" || quest.difficulty === "epic" || quest.difficulty === "hard";
    const adventure: AdventureEntry | null = isAdventure ? { id: `adv${Date.now()}`, title: quest.title, icon: quest.icon ?? "⚔️", stat: quest.stat, xp: quest.xp, date: today, difficulty: quest.difficulty } : null;
    const adventures = adventure ? [adventure, ...s.adventures].slice(0, 100) : s.adventures;
    const coinReward = Math.round(quest.xp / 10) + (quest.difficulty === "epic" ? 15 : quest.difficulty === "hard" ? 8 : quest.difficulty === "medium" ? 4 : 2);
    return { ...s, dailyQuests: s.dailyQuests.map((q) => (q.id === id ? { ...q, done: true } : q)), xp: s.xp + quest.xp, xpThisWeek: s.xpThisWeek + quest.xp, strideScore: Math.min(100, s.strideScore + Math.max(0.2, quest.xp / 80)), stats: newStats, completedCount: s.completedCount + 1, streak: newStreak, longestStreak, lastActiveDate: today, seenQuestIds: newSeen, adventures, coins: s.coins + coinReward };
  });
}

export function setMood(mood: Mood) {
  setState((s) => ({ ...s, mood, moodDate: new Date().toISOString().slice(0, 10) }));
}

export function useFreezeToken() {
  setState((s) => {
    if (s.freezeTokens <= 0) return s;
    return { ...s, freezeTokens: s.freezeTokens - 1, lastFreezeDate: new Date().toISOString().slice(0, 10) };
  });
}

export function getWeeklyRecap() {
  const s = current;
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekAdventures = s.adventures.filter((a) => a.date >= weekStartStr);
  const workouts = s.adventures.filter((a) => a.stat === "athleticism" || a.stat === "strength").length;
  const learningHours = Math.round(s.adventures.filter((a) => a.stat === "intelligence").length * 0.5 * 10) / 10;
  return {
    xpEarned: s.xpThisWeek,
    workouts,
    learningHours,
    adventures: weekAdventures.length,
    streak: s.streak,
    weekStart: weekStartStr,
  };
}

export function dismissRecap() {
  setState((s) => ({ ...s, lastRecapWeek: new Date().toISOString().slice(0, 10) }));
}

// ─── Shop functions ───
export function buyItem(itemId: string): { ok: boolean; error?: string } {
  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item) return { ok: false, error: "Item not found" };
  if (current.ownedItems.includes(itemId)) return { ok: false, error: "Already owned" };
  if (current.coins < item.price) return { ok: false, error: "Not enough coins" };
  setState((s) => ({ ...s, coins: s.coins - item.price, ownedItems: [...s.ownedItems, itemId] }));
  return { ok: true };
}

export function equipItem(itemId: string): { ok: boolean; error?: string } {
  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item) return { ok: false, error: "Item not found" };
  if (!current.ownedItems.includes(itemId)) return { ok: false, error: "Not owned" };
  setState((s) => ({ ...s, equippedItems: { ...s.equippedItems, [item.category]: itemId } }));
  return { ok: true };
}

export function unequipItem(category: ShopCategory) {
  setState((s) => {
    const next = { ...s.equippedItems };
    delete next[category];
    return { ...s, equippedItems: next };
  });
}

// ─── AI Coach ───
export function getCoachMessage(): string {
  const s = current;
  const firstName = (s.name || "Adventurer").split(" ")[0];
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekAdventures = s.adventures.filter((a) => a.date >= weekStartStr);
  const statEntries = Object.entries(s.stats) as [StatKey, number][];
  const weakest = statEntries.sort((a, b) => a[1] - b[1])[0];
  const strongest = statEntries.sort((a, b) => b[1] - a[1])[0];
  const weakLabel = STAT_META[weakest[0]].label;
  const strongLabel = STAT_META[strongest[0]].label;
  const parts: string[] = [];

  parts.push(`Hey ${firstName}`);
  if (s.completedCount === 0) {
    parts.push(`your journey starts today. Pick one quest — just one — and complete it. That's how legends begin.`);
    return parts.join(", ");
  }
  if (s.streak >= 7) parts.push(`you're on a ${s.streak}-day streak — that's real momentum. Keep it alive.`);
  else if (s.streak >= 3) parts.push(`your ${s.streak}-day streak is building. Don't break the chain.`);
  else if (s.streak === 0) parts.push(`today's a fresh start. One quest resets the streak.`);

  if (weekAdventures.length > 0) {
    const statCounts: Record<string, number> = {};
    weekAdventures.forEach((a) => { statCounts[a.stat] = (statCounts[a.stat] ?? 0) + 1; });
    const topStat = Object.entries(statCounts).sort((a, b) => b[1] - a[1])[0];
    if (topStat) parts.push(`You completed ${topStat[1]} ${STAT_META[topStat[0] as StatKey].label.toLowerCase()} adventures this week.`);
  }
  if (s.xpThisWeek > 0) parts.push(`You earned ${s.xpThisWeek} XP this week.`);
  parts.push(`Your ${strongLabel.toLowerCase()} is your strongest stat at ${strongest[1]}.`);
  parts.push(`Tomorrow's challenge: work on your ${weakLabel.toLowerCase()} — it's at ${weakest[1]}, the lowest. Even 20 minutes moves the needle.`);
  return parts.join(" ");
}

export function addCustomQuest(q: Omit<Quest, "id" | "done" | "createdAt">) {
  setState((s) => ({ ...s, dailyQuests: [...s.dailyQuests, { ...q, id: `c${Date.now()}`, done: false, createdAt: Date.now() }] }));
}

export function addSideQuest(q: Quest) {
  setState((s) => ({ ...s, dailyQuests: [...s.dailyQuests, q] }));
}

export function replaceQuest(id: string) {
  setState((s) => {
    const newQuest = generateSideQuest(s.interests, [...s.seenQuestIds, ...s.dailyQuests.map((q) => q.title)]);
    return { ...s, dailyQuests: s.dailyQuests.map((q) => q.id === id ? { ...newQuest, id: `r${Date.now()}` } : q) };
  });
}

export function removeQuest(id: string) {
  setState((s) => ({ ...s, dailyQuests: s.dailyQuests.filter((q) => q.id !== id) }));
}

export function finishAscendOnboarding(data: { name: string; goals: string[]; interests: string[]; score: number; tier: string; headline: string; reason: string; stats: { discipline: number; fitness: number; learning: number; focus: number; sleep: number; goals: number; }; }) {
  const displayName = data.name || "Adventurer";
  setState((s) => ({
    ...s, onboarded: true, name: displayName, goals: data.goals, interests: data.interests,
    strideScore: data.score, tier: data.tier, startingHeadline: data.headline, startingReason: data.reason,
    stats: { strength: data.stats.fitness, athleticism: Math.round((data.stats.fitness + data.stats.focus) / 2), intelligence: data.stats.learning, health: Math.round((data.stats.sleep + data.stats.fitness) / 2), discipline: data.stats.discipline, social: Math.max(20, Math.round((data.stats.goals + s.stats.social) / 2)), creativity: Math.max(20, Math.round((data.stats.learning + s.stats.creativity) / 2)), adventure: Math.max(15, Math.round((data.stats.goals + data.stats.discipline) / 3)) },
  }));
  void updateOwnProfile({ p_display_name: displayName }).catch((error: unknown) => {
    console.error("Unable to save profile name", error);
  });
}

export function resetAll() { current = { ...defaultState, dailyQuests: generateDailyQuests([]), lastQuestDate: new Date().toISOString().slice(0,10) }; persistLocal(); emit(); scheduleSync(); }
export function setAvatar(dataUrl: string | null) {
  setState((s) => ({ ...s, avatar: dataUrl }));
  void updateOwnProfile({ p_avatar_url: dataUrl }).catch((error: unknown) => {
    console.error("Unable to save profile avatar", error);
  });
}
export function setGoals(goals: string[]) { setState((s) => ({ ...s, goals })); }
export function addJournal(entry: Omit<JournalEntry, "id">) { setState((s) => ({ ...s, journal: [{ ...entry, id: `j${Date.now()}` }, ...s.journal].slice(0, 500) })); }
export function setTheme(theme: string) { setState((s) => ({ ...s, theme })); }
