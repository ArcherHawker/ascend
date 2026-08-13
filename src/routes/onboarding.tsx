import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { finishAscendOnboarding } from "@/lib/ascend-store";
import { ASSESSMENT_QUESTIONS, computeStartingProfile, tierColor, type AssessmentAnswers, type TierName } from "@/lib/assessment";
import { analyzeAssessment } from "@/lib/ai.functions";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { checkUsername, checkUsernameAI, USERNAME_GUIDELINE_MESSAGE } from "@/lib/moderation";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

const GOAL_OPTIONS = ["Build muscle","Lose weight","Read more","Learn a skill","Wake up early","Be more social","Start a side project","Meditate daily","Eat healthier","Run a 5K"];
const INTEREST_OPTIONS = ["Fitness","Reading","Music","Gaming","Cooking","Travel","Tech","Art","Sports","Photography","Writing","Nature"];

type Step = "welcome" | "goals" | "interests" | "assessment" | "calculating" | "reveal";

function Onboarding() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [answers, setAnswers] = useState<AssessmentAnswers>({ discipline: 0, fitness: 0, learning: 0, focus: 0, sleep: 0, goals: 0 });
  const [reveal, setReveal] = useState<{ score: number; tier: TierName; headline: string; reason: string; stats: { discipline: number; fitness: number; learning: number; focus: number; sleep: number; goals: number } } | null>(null);

  const toggle = (arr: string[], set: (v: string[]) => void, val: string) => set(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);

  const startAssessment = async () => {
    setStep("calculating");
    const profile = computeStartingProfile(answers, { goalCount: goals.length, interestCount: interests.length });
    try {
      const result = await analyzeAssessment({ data: { name, answers: answers as unknown as Record<string, number>, goals, interests, computedScore: profile.score, computedStats: profile.stats as unknown as Record<string, number>, tier: profile.tier } });
      setReveal({ score: profile.score, tier: profile.tier, headline: result.headline, reason: result.reason, stats: profile.stats });
    } catch {
      setReveal({ score: profile.score, tier: profile.tier, headline: "Your journey begins.", reason: `${name || "Adventurer"}, every great ascent starts with a single step.`, stats: profile.stats });
    }
    setTimeout(() => setStep("reveal"), 2800);
  };

  const complete = async () => {
    if (!reveal) return;
    finishAscendOnboarding({ name, goals, interests, score: reveal.score, tier: reveal.tier, headline: reveal.headline, reason: reveal.reason, stats: reveal.stats });
    const localCheck = checkUsername(name);
    if (localCheck.ok) {
      const aiCheck = await checkUsernameAI(name);
      if (aiCheck.approved) {
        await supabase.from("profiles").update({ username: name.trim() }).eq("id", auth.user?.id ?? "");
        auth.refreshProfile();
      }
    }
    navigate({ to: "/home", replace: true });
  };

  return (
    <div className="min-h-[100dvh] bg-nebula text-zinc-100 relative overflow-hidden">
      <div className="aurora-bg" />
      <div className="starfield" />
      <div className="max-w-md mx-auto min-h-[100dvh] px-6 pt-16 pb-8 relative z-10">
        {step === "welcome" && (
          <div className="flex flex-col items-center text-center animate-ascend-in">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-ascend-violet/40 blur-3xl rounded-full animate-glow-pulse" />
              <div className="relative size-24 rounded-3xl bg-gradient-to-tr from-ascend-violet via-ascend-fuchsia to-ascend-gold p-[2px]"><div className="size-full rounded-3xl bg-nebula grid place-items-center"><span className="font-display font-black text-5xl animate-text-shimmer">A</span></div></div>
            </div>
            <h1 className="font-display text-3xl font-black tracking-tighter">Welcome to Ascend</h1>
            <p className="mt-3 text-zinc-400 text-sm max-w-xs">Turn your real life into an RPG. Level up by completing quests, building streaks, and rising through the tiers.</p>
            <input value={name} onChange={(e) => { setName(e.target.value); const check = checkUsername(e.target.value); setNameError(check.ok ? null : check.reason ?? USERNAME_GUIDELINE_MESSAGE); }} placeholder="What should we call you?" maxLength={20} className="mt-10 w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-center text-base placeholder:text-zinc-600 focus:outline-none focus:border-ascend-violet transition-colors" />
            {nameError && <p className="mt-2 text-xs text-red-400 font-medium">{nameError}</p>}
            <button onClick={() => setStep("goals")} disabled={name.trim().length === 0 || !checkUsername(name).ok} className="mt-6 w-full bg-gradient-to-r from-ascend-violet via-ascend-fuchsia to-ascend-gold text-white font-black py-4 rounded-2xl active:scale-95 transition-transform disabled:opacity-50 disabled:grayscale">Begin Your Ascent</button>
          </div>
        )}
        {step === "goals" && (
          <div className="animate-rise-fade">
            <h2 className="font-display text-2xl font-black tracking-tighter mb-2">What do you want to achieve?</h2>
            <p className="text-zinc-400 text-sm mb-6">Pick at least one. This shapes your journey.</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {GOAL_OPTIONS.map((g) => <button key={g} onClick={() => toggle(goals, setGoals, g)} className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${goals.includes(g) ? "border-ascend-violet bg-ascend-violet/15 text-ascend-violet" : "border-white/10 bg-white/5 text-zinc-400"}`}>{g}</button>)}
            </div>
            <button onClick={() => setStep("interests")} disabled={goals.length === 0} className="w-full bg-gradient-to-r from-ascend-violet to-ascend-fuchsia text-white font-bold py-3.5 rounded-xl active:scale-95 transition-transform disabled:opacity-50">Continue</button>
            <button onClick={() => setStep("welcome")} className="w-full mt-3 text-zinc-500 text-sm font-semibold py-2">Back</button>
          </div>
        )}
        {step === "interests" && (
          <div className="animate-rise-fade">
            <h2 className="font-display text-2xl font-black tracking-tighter mb-2">What are you into?</h2>
            <p className="text-zinc-400 text-sm mb-6">We'll tailor quests to your vibe.</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {INTEREST_OPTIONS.map((i) => <button key={i} onClick={() => toggle(interests, setInterests, i)} className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${interests.includes(i) ? "border-ascend-violet bg-ascend-violet/15 text-ascend-violet" : "border-white/10 bg-white/5 text-zinc-400"}`}>{i}</button>)}
            </div>
            <button onClick={() => setStep("assessment")} disabled={interests.length === 0} className="w-full bg-gradient-to-r from-ascend-violet to-ascend-fuchsia text-white font-bold py-3.5 rounded-xl active:scale-95 transition-transform disabled:opacity-50">Continue</button>
            <button onClick={() => setStep("goals")} className="w-full mt-3 text-zinc-500 text-sm font-semibold py-2">Back</button>
          </div>
        )}
        {step === "assessment" && <AssessmentQuiz answers={answers} setAnswers={setAnswers} onDone={startAssessment} onBack={() => setStep("interests")} />}
        {step === "calculating" && (
          <div className="flex flex-col items-center justify-center min-h-[80dvh] text-center">
            <div className="relative mb-8"><div className="absolute inset-0 bg-ascend-violet/40 blur-3xl rounded-full animate-glow-pulse" /><div className="relative size-20 rounded-full border-2 border-ascend-violet border-t-transparent animate-spin" /></div>
            <h2 className="font-display text-xl font-black tracking-tight">Analyzing your potential…</h2>
            <p className="mt-2 text-zinc-500 text-sm">Calculating your starting stats and tier.</p>
          </div>
        )}
        {step === "reveal" && reveal && (
          <div className="flex flex-col items-center text-center pt-10 animate-ascend-in">
            <span className="text-[10px] font-black text-ascend-gold uppercase tracking-[0.3em] mb-2 block">Your Life Score</span>
            <div className="text-8xl font-display font-black tracking-tighter text-white drop-shadow-[0_0_35px_rgba(167,139,250,0.5)] tabular-nums mb-4">{reveal.score}</div>
            <div className={`px-5 py-2 bg-gradient-to-r ${tierColor(reveal.tier)} rounded-full text-sm font-black text-white uppercase tracking-[0.2em] mb-8`}>{reveal.tier}</div>
            <div className="bg-card border border-white/5 rounded-2xl p-5 mb-6 w-full text-left">
              <p className="text-sm font-bold text-ascend-violet mb-2">{reveal.headline}</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{reveal.reason}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 w-full mb-8">
              {Object.entries(reveal.stats).map(([key, val]) => <div key={key} className="bg-card border border-white/5 rounded-xl p-3 text-center"><div className="font-display font-extrabold text-lg">{val}</div><div className="text-[9px] uppercase tracking-widest text-zinc-500 mt-0.5 font-bold">{key}</div></div>)}
            </div>
            <button onClick={complete} className="w-full bg-gradient-to-r from-ascend-violet via-ascend-fuchsia to-ascend-gold text-white font-black py-4 rounded-2xl active:scale-95 transition-transform">Start Playing</button>
          </div>
        )}
      </div>
    </div>
  );
}

function AssessmentQuiz({ answers, setAnswers, onDone, onBack }: { answers: AssessmentAnswers; setAnswers: (a: AssessmentAnswers) => void; onDone: () => void; onBack: () => void }) {
  const [idx, setIdx] = useState(0);
  const q = ASSESSMENT_QUESTIONS[idx];
  const progress = (idx / ASSESSMENT_QUESTIONS.length) * 100;
  const select = (optionIdx: number) => { const newAnswers = { ...answers, [q.key]: optionIdx }; setAnswers(newAnswers); if (idx < ASSESSMENT_QUESTIONS.length - 1) setIdx(idx + 1); else onDone(); };
  return (
    <div className="animate-rise-fade">
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-8"><div className="h-full bg-gradient-to-r from-ascend-violet to-ascend-gold rounded-full transition-all duration-500" style={{ width: `${progress}%` }} /></div>
      <div className="text-center mb-8"><div className="text-4xl mb-3">{q.icon}</div><h2 className="font-display text-xl font-black tracking-tighter mb-2">{q.title}</h2><p className="text-zinc-400 text-sm">{q.question}</p></div>
      <div className="space-y-3">
        {q.options.map((opt, i) => <button key={opt} onClick={() => select(i)} className={`w-full px-5 py-4 rounded-2xl border text-sm font-semibold text-left transition-all active:scale-95 ${answers[q.key] === i ? "border-ascend-violet bg-ascend-violet/10 text-ascend-violet" : "border-white/10 bg-white/5 text-zinc-300"}`}>{opt}</button>)}
      </div>
      <button onClick={idx === 0 ? onBack : () => setIdx(idx - 1)} className="w-full mt-6 text-zinc-500 text-sm font-semibold py-2">Back</button>
    </div>
  );
}
