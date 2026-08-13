export type AssessmentAnswers = { discipline: number; fitness: number; learning: number; focus: number; sleep: number; goals: number; };

export const ASSESSMENT_QUESTIONS: { key: keyof AssessmentAnswers; icon: string; title: string; question: string; options: string[]; }[] = [
  { key: "discipline", icon: "⚡", title: "Discipline", question: "How often do you finish tasks you set for yourself?", options: ["Never", "Sometimes", "Usually", "Almost always"] },
  { key: "fitness", icon: "💪", title: "Fitness", question: "How many days a week do you exercise?", options: ["0", "1–2", "3–5", "6+"] },
  { key: "learning", icon: "🧠", title: "Learning", question: "How often do you learn something new outside school or work?", options: ["Never", "Monthly", "Weekly", "Daily"] },
  { key: "focus", icon: "🎯", title: "Focus", question: "How long can you focus without distractions?", options: ["<15 min", "15–30 min", "30–60 min", "1+ hour"] },
  { key: "sleep", icon: "🌙", title: "Sleep", question: "How consistent is your sleep schedule?", options: ["Very inconsistent", "Sometimes", "Mostly", "Very consistent"] },
  { key: "goals", icon: "🗺️", title: "Goals", question: "How clear are your goals right now?", options: ["No goals", "Some ideas", "Clear goals", "Detailed plan"] },
];

export type StartingProfile = { score: number; tier: TierName; stats: { discipline: number; fitness: number; learning: number; focus: number; sleep: number; goals: number; }; };
export type TierName = "Seed" | "Beginner" | "Builder" | "Challenger" | "Elite" | "Master";

export function tierFor(score: number): TierName {
  if (score <= 20) return "Seed"; if (score <= 40) return "Beginner"; if (score <= 60) return "Builder";
  if (score <= 80) return "Challenger"; if (score <= 95) return "Elite"; return "Master";
}

export function tierColor(tier: TierName): string {
  switch (tier) {
    case "Seed": return "from-emerald-400 to-teal-500"; case "Beginner": return "from-sky-400 to-blue-500";
    case "Builder": return "from-indigo-400 to-violet-500"; case "Challenger": return "from-violet-500 to-fuchsia-500";
    case "Elite": return "from-amber-400 to-orange-500"; case "Master": return "from-ascend-gold to-amber-300";
  }
}

function toValue(idx: number): number { return [10, 35, 60, 85][Math.max(0, Math.min(3, idx))]; }

export function computeStartingProfile(answers: AssessmentAnswers, extras: { goalCount: number; interestCount: number }): StartingProfile {
  const stats = { discipline: toValue(answers.discipline), fitness: toValue(answers.fitness), learning: toValue(answers.learning), focus: toValue(answers.focus), sleep: toValue(answers.sleep), goals: toValue(answers.goals) };
  const weighted = stats.discipline * 1.2 + stats.fitness * 1.0 + stats.learning * 1.0 + stats.focus * 1.15 + stats.sleep * 1.05 + stats.goals * 0.9;
  const totalWeight = 1.2 + 1.0 + 1.0 + 1.15 + 1.05 + 0.9;
  let score = weighted / totalWeight;
  score += Math.min(4, extras.goalCount * 0.75); score += Math.min(3, extras.interestCount * 0.3);
  score = Math.max(8, Math.min(95, Math.round(score)));
  return { score, tier: tierFor(score), stats };
}
