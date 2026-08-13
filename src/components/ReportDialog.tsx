import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth, type Profile } from "@/lib/auth-context";

type Reason = "inappropriate_username" | "inappropriate_avatar" | "harassment" | "cheating" | "spam" | "other";

const REASONS: { key: Reason; label: string; icon: string }[] = [
  { key: "inappropriate_username", label: "Inappropriate username", icon: "🚫" },
  { key: "inappropriate_avatar", label: "Inappropriate profile picture", icon: "🖼️" },
  { key: "harassment", label: "Harassment", icon: "😠" },
  { key: "cheating", label: "Cheating / fake progress", icon: "🎮" },
  { key: "spam", label: "Spam", icon: "📨" },
  { key: "other", label: "Other", icon: "❓" },
];

export function ReportDialog({ target, onClose }: { target: Profile; onClose: () => void }) {
  const auth = useAuth();
  const [reason, setReason] = useState<Reason | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reason || !auth.user) return;
    setSubmitting(true);
    setError(null);
    const { error: insertError } = await supabase
      .from("reports")
      .insert({ reported_user_id: target.id, reporter_user_id: auth.user.id, reason, description: description.trim() || null, status: "pending" });
    setSubmitting(false);
    if (insertError) { setError("Could not submit report. Try again."); return; }
    setSubmitted(true);
    setTimeout(() => onClose(), 1800);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-nebula border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 max-h-[85dvh] overflow-y-auto animate-rise-fade" onClick={(e) => e.stopPropagation()}>
        {submitted ? (
          <div className="text-center py-8">
            <div className="size-16 mx-auto rounded-full bg-emerald-500/20 grid place-items-center mb-4"><span className="text-3xl">✓</span></div>
            <h2 className="font-display text-xl font-extrabold">Report Submitted</h2>
            <p className="text-sm text-zinc-400 mt-2">Thank you. Our moderation team will review this report.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-extrabold">Report User</h2>
              <button onClick={onClose} className="size-8 rounded-full bg-white/5 grid place-items-center text-zinc-400 text-sm active:scale-90">✕</button>
            </div>
            <div className="flex items-center gap-3 mb-5 p-3 bg-white/5 rounded-xl">
              <div className="size-10 rounded-full bg-gradient-to-tr from-ascend-violet/40 to-ascend-fuchsia/40 p-[2px] shrink-0">
                <div className="size-full rounded-full bg-nebula grid place-items-center font-bold text-xs overflow-hidden">
                  {target.avatar_moderated && target.avatar_url ? <img src={target.avatar_url} alt={target.username} className="size-full object-cover" /> : target.username.charAt(0).toUpperCase()}
                </div>
              </div>
              <div><p className="font-semibold text-sm">{target.username}</p><p className="text-xs text-zinc-500">Reported by you</p></div>
            </div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Reason</p>
            <div className="space-y-2 mb-5">
              {REASONS.map((r) => (
                <button key={r.key} onClick={() => setReason(r.key)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left active:scale-95 ${reason === r.key ? "border-ascend-violet bg-ascend-violet/10" : "border-white/5 bg-white/5"}`}>
                  <span className="text-lg">{r.icon}</span>
                  <span className="text-sm font-semibold">{r.label}</span>
                  {reason === r.key && <span className="ml-auto text-ascend-violet">✓</span>}
                </button>
              ))}
            </div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Description (optional)</p>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add details about the issue…" rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-ascend-violet resize-none mb-4" />
            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 mb-4">{error}</div>}
            <button onClick={handleSubmit} disabled={!reason || submitting} className="w-full bg-gradient-to-r from-ascend-violet to-ascend-fuchsia text-white font-bold py-3.5 rounded-xl active:scale-95 transition-transform disabled:opacity-50 disabled:grayscale">{submitting ? "Submitting…" : "Submit Report"}</button>
          </>
        )}
      </div>
    </div>
  );
}
