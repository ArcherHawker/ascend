import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { loadFromSupabase, enableSync, disableSync } from "./ascend-store";

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  date_of_birth: string | null;
  avatar_url: string | null;
  avatar_moderated: boolean;
  role: "user" | "admin";
  status: "active" | "warned" | "suspended" | "banned";
  warning_message: string | null;
  suspended_until: string | null;
  created_at: string;
  bio: string | null;
  public_profile: boolean;
  leaderboard_visible: boolean;
  share_stats_with_friends: boolean;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  emailVerified: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  session: null, user: null, profile: null, loading: true, isAdmin: false, emailVerified: false, refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    if (error) throw error;
    setProfile(data as Profile | null);
  };

  const refreshProfile = async () => {
    if (session?.user?.id) await loadProfile(session.user.id);
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user?.id) {
        loadProfile(data.session.user.id)
          .catch((error: unknown) => console.error("Unable to load profile", error))
          .finally(() => mounted && setLoading(false));
      } else { setLoading(false); }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === "SIGNED_OUT" || !newSession?.user?.id) {
        setProfile(null);
        setLoading(false);
        disableSync();
      } else {
        enableSync();
        (async () => {
          try {
            await loadFromSupabase();
            await loadProfile(newSession.user.id);
          } catch (error) {
            console.error("Unable to restore account data", error);
          } finally {
            if (mounted) setLoading(false);
          }
        })();
      }
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const emailVerified = !!session?.user?.email_confirmed_at || !!session?.user?.confirmed_at;

  return <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, isAdmin: profile?.role === "admin", emailVerified, refreshProfile }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
