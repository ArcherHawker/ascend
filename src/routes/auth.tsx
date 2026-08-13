import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { checkUsername, checkUsernameAI, USERNAME_GUIDELINE_MESSAGE } from "@/lib/moderation";
import { useAscend } from "@/lib/ascend-store";

export const Route = createFileRoute("/auth")({ component: AuthPage });

type View = "signin" | "signup" | "verify-email" | "forgot-password" | "reset-sent";

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function AuthPage() {
  const navigate = useNavigate();
  const stride = useAscend();
  const initialMode = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("mode") : null;
  const [view, setView] = useState<View>(initialMode === "signin" ? "signin" : "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) { setEmailError("Email is required."); return false; }
    if (!EMAIL_REGEX.test(value.trim())) { setEmailError("Please enter a valid email address."); return false; }
    setEmailError(null);
    return true;
  };

  const validateUsername = (value: string) => {
    setUsername(value);
    if (!value.trim()) { setUsernameError(null); return; }
    const check = checkUsername(value);
    setUsernameError(check.ok ? null : check.reason ?? USERNAME_GUIDELINE_MESSAGE);
  };

  const getAge = (dateStr: string): number | null => {
    if (!dateStr) return null;
    const birth = new Date(dateStr);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    if (!validateEmail(email)) return;

    if (view === "signup") {
      const localCheck = checkUsername(username);
      if (!localCheck.ok) { setUsernameError(localCheck.reason ?? USERNAME_GUIDELINE_MESSAGE); return; }
      const age = getAge(dob);
      if (age === null) { setError("Please enter a valid date of birth."); return; }
      if (age < 13) { setError("You must be at least 13 years old to create an account."); return; }
      if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
      setLoading(true);
      const aiCheck = await checkUsernameAI(username);
      if (!aiCheck.approved) { setUsernameError(aiCheck.reason ?? USERNAME_GUIDELINE_MESSAGE); setLoading(false); return; }

      try {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (signUpError) throw new Error(friendlyAuthError(signUpError.message));
        if (!data.user) throw new Error("Account creation failed. Please try again.");

        // Insert profile — user is not confirmed yet but the row needs to exist
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          username: username.trim(),
          display_name: displayName.trim() || username.trim(),
          date_of_birth: dob,
        });
        if (profileError) {
          if (profileError.message.includes("duplicate")) throw new Error("That username is already taken. Please choose another one.");
          throw new Error("Account created but profile setup failed. Please try signing in.");
        }

        // Sign the user out — they must verify email before accessing the app
        await supabase.auth.signOut();
        setPendingEmail(email.trim());
        setView("verify-email");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    } else if (view === "signin") {
      setLoading(true);
      try {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw new Error(friendlyAuthError(signInError.message));

        // Check if email is verified
        const user = signInData.user;
        const isVerified = !!user?.email_confirmed_at || !!user?.confirmed_at;
        if (!isVerified) {
          await supabase.auth.signOut();
          setPendingEmail(email.trim());
          setView("verify-email");
          setLoading(false);
          return;
        }

        // Check ban/suspension status
        const { data: profile } = await supabase
          .from("profiles")
          .select("status, suspended_until")
          .eq("id", user?.id)
          .maybeSingle();
        if (profile?.status === "banned") {
          await supabase.auth.signOut();
          throw new Error("This account has been banned. Contact support if you believe this is an error.");
        }
        if (profile?.status === "suspended") {
          const until = profile.suspended_until ? new Date(profile.suspended_until) : null;
          if (until && until > new Date()) {
            await supabase.auth.signOut();
            throw new Error(`Account suspended until ${until.toLocaleDateString()}.`);
          }
        }
        navigate({ to: stride.onboarded ? "/home" : "/onboarding", replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    } else if (view === "forgot-password") {
      setLoading(true);
      try {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) throw new Error(friendlyAuthError(resetError.message));
        setPendingEmail(email.trim());
        setView("reset-sent");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleResendVerification = async () => {
    if (!pendingEmail) return;
    setLoading(true);
    setError(null);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: pendingEmail,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      });
      if (resendError) throw new Error(friendlyAuthError(resendError.message));
      setInfoMsg("Verification email sent. Check your inbox.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend email.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (newView: View) => {
    setView(newView);
    setError(null);
    setEmailError(null);
    setUsernameError(null);
    setInfoMsg(null);
  };

  // ─── Verify Email screen ───
  if (view === "verify-email") {
    return (
      <Shell>
        <div className="text-center mb-8 animate-ascend-in">
          <div className="relative mx-auto w-fit mb-5">
            <div className="absolute inset-0 bg-ascend-violet/40 blur-3xl rounded-full animate-glow-pulse" />
            <div className="relative size-20 rounded-3xl bg-gradient-to-tr from-ascend-violet via-ascend-fuchsia to-ascend-gold p-[2px]">
              <div className="size-full rounded-3xl bg-nebula grid place-items-center">
                <span className="text-3xl">📬</span>
              </div>
            </div>
          </div>
          <h1 className="font-display text-2xl font-black tracking-tighter">Check Your Email</h1>
          <p className="mt-3 text-zinc-400 text-sm leading-relaxed">
            We sent a verification link to <span className="text-zinc-200 font-semibold">{pendingEmail}</span>.
            Click the link in the email to confirm your account, then sign in.
          </p>
        </div>
        {infoMsg && <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-400 mb-4">{infoMsg}</div>}
        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 mb-4">{error}</div>}
        <button
          onClick={handleResendVerification}
          disabled={loading}
          className="w-full border border-white/15 bg-white/5 text-zinc-200 font-bold py-3.5 rounded-xl text-sm active:scale-95 transition-transform disabled:opacity-50 mb-3"
        >
          {loading ? "Sending…" : "Resend Verification Email"}
        </button>
        <button
          onClick={() => { resetForm("signin"); setEmail(pendingEmail); }}
          className="w-full text-sm text-zinc-400 hover:text-zinc-200 transition-colors py-2"
        >
          I&apos;ve verified — <span className="text-ascend-violet font-semibold">Sign in now</span>
        </button>
      </Shell>
    );
  }

  // ─── Reset Sent screen ───
  if (view === "reset-sent") {
    return (
      <Shell>
        <div className="text-center mb-8 animate-ascend-in">
          <div className="relative mx-auto w-fit mb-5">
            <div className="absolute inset-0 bg-ascend-violet/40 blur-3xl rounded-full animate-glow-pulse" />
            <div className="relative size-20 rounded-3xl bg-gradient-to-tr from-ascend-violet via-ascend-fuchsia to-ascend-gold p-[2px]">
              <div className="size-full rounded-3xl bg-nebula grid place-items-center">
                <span className="text-3xl">📧</span>
              </div>
            </div>
          </div>
          <h1 className="font-display text-2xl font-black tracking-tighter">Reset Link Sent</h1>
          <p className="mt-3 text-zinc-400 text-sm leading-relaxed">
            We sent a password reset link to <span className="text-zinc-200 font-semibold">{pendingEmail}</span>.
            Click the link in the email to set a new password.
          </p>
        </div>
        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 mb-4">{error}</div>}
        <button
          onClick={() => { resetForm("signin"); setEmail(pendingEmail); }}
          className="w-full text-sm text-zinc-400 hover:text-zinc-200 transition-colors py-2"
        >
          <span className="text-ascend-violet font-semibold">Back to sign in</span>
        </button>
      </Shell>
    );
  }

  // ─── Forgot Password screen ───
  if (view === "forgot-password") {
    return (
      <Shell>
        <div className="text-center mb-8 animate-ascend-in">
          <h1 className="font-display text-3xl font-black tracking-tighter">Forgot Password?</h1>
          <p className="mt-2 text-zinc-400 text-sm">Enter your email and we&apos;ll send you a secure reset link.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3.5 animate-rise-fade">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); validateEmail(e.target.value); }}
              placeholder="you@example.com"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-ascend-violet transition-colors"
            />
            {emailError && <p className="mt-1.5 text-xs text-red-400 font-medium">{emailError}</p>}
          </div>
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-ascend-violet via-ascend-fuchsia to-ascend-gold text-white font-black py-4 rounded-2xl active:scale-95 transition-transform disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2">
            {loading ? <><Spinner /> Sending…</> : "Send Reset Link"}
          </button>
        </form>
        <div className="mt-5 text-center">
          <button onClick={() => resetForm("signin")} className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
            <span className="text-ascend-violet font-semibold">Back to sign in</span>
          </button>
        </div>
      </Shell>
    );
  }

  // ─── Sign In / Sign Up screens ───
  const isSignUp = view === "signup";

  return (
    <Shell>
      <div className="text-center mb-8 animate-ascend-in">
        <div className="relative mx-auto w-fit mb-5">
          <div className="absolute inset-0 bg-ascend-violet/40 blur-3xl rounded-full animate-glow-pulse" />
          <div className="relative size-20 rounded-3xl bg-gradient-to-tr from-ascend-violet via-ascend-fuchsia to-ascend-gold p-[2px]">
            <div className="size-full rounded-3xl bg-nebula grid place-items-center">
              <span className="font-display font-black text-3xl animate-text-shimmer">A</span>
            </div>
          </div>
        </div>
        <h1 className="font-display text-3xl font-black tracking-tighter">{isSignUp ? "Join Ascend" : "Welcome Back"}</h1>
        <p className="mt-2 text-zinc-400 text-sm">{isSignUp ? "Create your account to begin your ascent." : "Sign in to continue your journey."}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3.5 animate-rise-fade">
        {isSignUp && (
          <>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Username</label>
              <input
                value={username}
                onChange={(e) => validateUsername(e.target.value)}
                placeholder="Choose a username"
                maxLength={20}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-ascend-violet transition-colors"
              />
              {usernameError && <p className="mt-1.5 text-xs text-red-400 font-medium">{usernameError}</p>}
              {!usernameError && username.trim() && <p className="mt-1.5 text-xs text-emerald-400/70 font-medium">Looks good.</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Display Name <span className="text-zinc-600 normal-case">(optional)</span></label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Name shown on your profile"
                maxLength={30}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-ascend-violet transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-ascend-violet transition-colors"
              />
              <p className="mt-1.5 text-xs text-zinc-600">You must be at least 13 years old.</p>
            </div>
          </>
        )}
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); validateEmail(e.target.value); }}
            placeholder="you@example.com"
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-ascend-violet transition-colors"
          />
          {emailError && <p className="mt-1.5 text-xs text-red-400 font-medium">{emailError}</p>}
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Password</label>
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
        {!isSignUp && (
          <div className="text-right">
            <button type="button" onClick={() => resetForm("forgot-password")} className="text-xs text-zinc-400 hover:text-ascend-violet transition-colors font-medium">
              Forgot Password?
            </button>
          </div>
        )}
        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>}
        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-ascend-violet via-ascend-fuchsia to-ascend-gold text-white font-black py-4 rounded-2xl active:scale-95 transition-transform disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2">
          {loading ? <><Spinner /> Please wait…</> : isSignUp ? "Create Account" : "Sign In"}
        </button>
      </form>
      <div className="mt-5 text-center">
        <button onClick={() => resetForm(isSignUp ? "signin" : "signup")} className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
          {isSignUp ? "Already have an account? " : "Need an account? "}
          <span className="text-ascend-violet font-semibold">{isSignUp ? "Sign in" : "Sign up"}</span>
        </button>
      </div>
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

function friendlyAuthError(msg: string): string {
  if (msg.includes("User already registered")) return "An account with this email already exists. Try signing in.";
  if (msg.includes("Invalid login credentials")) return "Incorrect email or password.";
  if (msg.includes("Email not confirmed")) return "Please verify your email before signing in. Check your inbox for the verification link.";
  if (msg.includes("Password should be at least")) return "Password must be at least 6 characters.";
  if (msg.includes("Email rate limit") || msg.includes("rate limit")) return "Too many attempts. Please wait a moment and try again.";
  if (msg.includes("For security purposes")) return "For security, please wait a moment before trying again.";
  return msg;
}
