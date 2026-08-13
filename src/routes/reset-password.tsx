import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/reset-password")({ component: ResetPassword });

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase sends the recovery token in the URL hash. The client auto-processes it.
    const init = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session) {
        // The hash fragment may still need processing — try listening for the event
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "PASSWORD_RECOVERY" && session) {
            setReady(true);
          }
        });
        // Also check if we already have a session from hash processing
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: d }) => {
            if (d.session) setReady(true);
          });
        }, 500);
        return () => { listener.subscription.unsubscribe(); };
      }
      setReady(true);
    };
    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      setSuccess(true);
      setTimeout(() => {
        supabase.auth.signOut().then(() => navigate({ to: "/auth", replace: true }));
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setLoading(false);
    }
  };

  if (!ready && !success) {
    return (
      <Shell>
        <div className="text-center py-20">
          <div className="size-10 border-2 border-ascend-violet/30 border-t-ascend-violet rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-zinc-400">Verifying your reset link…</p>
        </div>
      </Shell>
    );
  }

  if (success) {
    return (
      <Shell>
        <div className="text-center mb-8 animate-ascend-in">
          <div className="relative mx-auto w-fit mb-5">
            <div className="absolute inset-0 bg-emerald-500/30 blur-3xl rounded-full animate-glow-pulse" />
            <div className="relative size-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-emerald-400 p-[2px]">
              <div className="size-full rounded-3xl bg-nebula grid place-items-center">
                <span className="text-3xl">✓</span>
              </div>
            </div>
          </div>
          <h1 className="font-display text-2xl font-black tracking-tighter">Password Updated</h1>
          <p className="mt-3 text-zinc-400 text-sm">Your password has been changed. Redirecting you to sign in…</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="text-center mb-8 animate-ascend-in">
        <div className="relative mx-auto w-fit mb-5">
          <div className="absolute inset-0 bg-ascend-violet/40 blur-3xl rounded-full animate-glow-pulse" />
          <div className="relative size-20 rounded-3xl bg-gradient-to-tr from-ascend-violet via-ascend-fuchsia to-ascend-gold p-[2px]">
            <div className="size-full rounded-3xl bg-nebula grid place-items-center">
              <span className="text-3xl">🔐</span>
            </div>
          </div>
        </div>
        <h1 className="font-display text-2xl font-black tracking-tighter">Set New Password</h1>
        <p className="mt-2 text-zinc-400 text-sm">Choose a new password for your account.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3.5 animate-rise-fade">
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">New Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
            minLength={6}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-ascend-violet transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Confirm Password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter your password"
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-ascend-violet transition-colors"
          />
        </div>
        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>}
        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-ascend-violet via-ascend-fuchsia to-ascend-gold text-white font-black py-4 rounded-2xl active:scale-95 transition-transform disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2">
          {loading ? <><Spinner /> Updating…</> : "Update Password"}
        </button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-nebula text-zinc-100 relative overflow-hidden">
      <div className="aurora-bg" />
      <div className="starfield" />
      <div className="max-w-md mx-auto min-h-[100dvh] flex flex-col px-6 pt-12 pb-8 relative z-10 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="size-5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
