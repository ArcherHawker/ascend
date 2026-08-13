export type AssessmentInput = { name: string; answers: Record<string, number>; goals: string[]; interests: string[]; computedScore: number; computedStats: Record<string, number>; tier: string; };
export type AssessmentResult = { ok: boolean; headline: string; reason: string; strongest: string; growth: string; };

export async function analyzeAssessment(input: { data: AssessmentInput }): Promise<AssessmentResult> {
  const d = input.data;
  const strongest = Object.entries(d.computedStats).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "discipline";
  const growth = Object.entries(d.computedStats).sort((a, b) => a[1] - b[1])[0]?.[0] ?? "focus";
  const headline = headlineForTier(d.tier);
  const reason = buildCoachMessage(d.name, d.tier, strongest, growth, d.goals, d.interests);
  return { ok: true, headline, reason, strongest, growth };
}

function headlineForTier(tier: string) {
  switch (tier) {
    case "Seed": return "The seed is planted."; case "Beginner": return "The climb begins.";
    case "Builder": return "You're building the foundation."; case "Challenger": return "You're already ahead.";
    case "Elite": return "You move like an athlete of life."; case "Master": return "You've mastered the basics — now transcend.";
    default: return "Your ascent begins.";
  }
}

function buildCoachMessage(name: string, tier: string, strongest: string, growth: string, goals: string[], interests: string[]): string {
  const firstName = (name || "Adventurer").split(" ")[0];
  const strongLabel = strongest.charAt(0).toUpperCase() + strongest.slice(1);
  const growthLabel = growth.charAt(0).toUpperCase() + growth.slice(1);
  const goalLine = goals.length > 0 ? ` You said you want to ${goals.slice(0, 2).join(" and ").toLowerCase()} — that's your north star.` : "";
  const interestLine = interests.length > 0 ? ` Lean into ${interests[0].toLowerCase()} — it's fuel, not distraction.` : "";
  return `${firstName}, your ${strongLabel.toLowerCase()} is your edge — it'll carry the rest. The ${growthLabel.toLowerCase()} needs work, and that's where the fastest gains are.${goalLine}${interestLine} Small quests, every day. That's how you rise.`;
}
