import { useSyncExternalStore } from "react";
import { getState, levelFromXp, type AscendState } from "./ascend-store";

export type NotificationPref = {
  questReminders: boolean;
  streakAlerts: boolean;
  levelUpAlerts: boolean;
  weeklyRecap: boolean;
  achievementAlerts: boolean;
};

const DEFAULT_PREFS: NotificationPref = {
  questReminders: true,
  streakAlerts: true,
  levelUpAlerts: true,
  weeklyRecap: true,
  achievementAlerts: true,
};

let prefs: NotificationPref = { ...DEFAULT_PREFS };
let dismissed: string[] = [];
let listeners = new Set<() => void>();

function loadPrefs() {
  try {
    const stored = localStorage.getItem("ascend-notif-prefs");
    if (stored) prefs = { ...DEFAULT_PREFS, ...JSON.parse(stored) };
    const d = localStorage.getItem("ascend-notif-dismissed");
    if (d) dismissed = JSON.parse(d);
  } catch {}
}
loadPrefs();

function persist() {
  try {
    localStorage.setItem("ascend-notif-prefs", JSON.stringify(prefs));
    localStorage.setItem("ascend-notif-dismissed", JSON.stringify(dismissed));
  } catch {}
  listeners.forEach((l) => l());
}

export function updatePref(key: keyof NotificationPref, value: boolean) {
  prefs = { ...prefs, [key]: value };
  persist();
}

export function getPrefs(): NotificationPref { return prefs; }

function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return prefs; }

export function useNotificationPrefs() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export type SmartNotification = {
  id: string;
  icon: string;
  title: string;
  body: string;
  category: keyof NotificationPref;
  priority: number;
};

function xpToNextLevel(xp: number): number {
  const { level } = levelFromXp(xp);
  const nextLevelXp = level * 100;
  return nextLevelXp - xp;
}

export function getActiveNotifications(): SmartNotification[] {
  const s: AscendState = getState();
  const today = new Date().toISOString().slice(0, 10);
  const notifs: SmartNotification[] = [];

  // Quest reminder - incomplete daily quests
  if (prefs.questReminders) {
    const incomplete = s.dailyQuests.filter((q) => !q.done);
    if (incomplete.length > 0 && s.lastQuestDate !== today) {
      const adventureQuest = incomplete.find((q) => q.stat === "adventure");
      if (adventureQuest) {
        notifs.push({
          id: "quest_adventure",
          icon: "🌎",
          title: "Your Adventure Quest is waiting",
          body: `"${adventureQuest.title}" is ready to complete. Claim your XP!`,
          category: "questReminders",
          priority: 3,
        });
      } else {
        notifs.push({
          id: "quest_pending",
          icon: "⚔️",
          title: `${incomplete.length} quest${incomplete.length > 1 ? "s" : ""} waiting for you`,
          body: "A few minutes is all it takes. Keep the streak alive.",
          category: "questReminders",
          priority: 2,
        });
      }
    }
  }

  // XP to next level
  if (prefs.levelUpAlerts) {
    const xpRemaining = xpToNextLevel(s.xp);
    if (xpRemaining > 0 && xpRemaining <= 50) {
      const { level } = levelFromXp(s.xp);
      notifs.push({
        id: "xp_close",
        icon: "🔥",
        title: `You're ${xpRemaining} XP away from Level ${level + 1}`,
        body: "One more quest could do it. Push for it!",
        category: "levelUpAlerts",
        priority: 4,
      });
    }
  }

  // Streak alert
  if (prefs.streakAlerts && s.streak > 0) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    if (s.lastActiveDate !== today && s.lastActiveDate === yStr) {
      notifs.push({
        id: "streak_at_risk",
        icon: "🔥",
        title: `Your ${s.streak}-day streak needs you today`,
        body: "Complete one quest before midnight to keep it alive.",
        category: "streakAlerts",
        priority: 5,
      });
    } else if (s.streak >= 5 && s.lastActiveDate === today) {
      const incomplete = s.dailyQuests.filter((q) => !q.done);
      if (incomplete.length > 0) {
        notifs.push({
          id: "streak_momentum",
          icon: "⚡",
          title: `${s.streak}-day streak — keep the momentum going`,
          body: "You've shown up today. Finish your remaining quests to make it count.",
          category: "streakAlerts",
          priority: 2,
        });
      }
    }
  }

  // Coin milestone
  if (s.coins > 0 && s.coins >= 200) {
    const spentRecently = s.ownedItems.length;
    if (spentRecently === 0) {
      notifs.push({
        id: "coins_unspent",
        icon: "🪙",
        title: `You have ${s.coins} coins burning a hole in your pocket`,
        body: "Check out the Rewards Shop — new frames and badges await.",
        category: "questReminders",
        priority: 1,
      });
    }
  }

  // Filter dismissed
  const active = notifs.filter((n) => !dismissed.includes(n.id));
  return active.sort((a, b) => b.priority - a.priority);
}

export function dismissNotification(id: string) {
  dismissed = [...dismissed, id];
  persist();
}

export function resetDismissed() {
  dismissed = [];
  persist();
}
