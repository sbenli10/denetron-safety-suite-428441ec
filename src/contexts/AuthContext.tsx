import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Sentry } from "@/lib/sentry";

type AuthProfile = Database["public"]["Tables"]["profiles"]["Row"];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  refreshProfile: () => Promise<void>;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  refreshProfile: async () => {},
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const hasAuthParams =
      window.location.search.includes("code=") ||
      window.location.search.includes("access_token=") ||
      window.location.hash.includes("access_token=") ||
      window.location.pathname === "/auth/callback";

    const fetchProfile = async (userId: string | null) => {
      if (!userId) {
        if (mounted) setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error("Failed to get profile:", error);
        setProfile(null);
        return;
      }

      setProfile(data ?? null);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setSession(session);
        Sentry.setUser(
          session?.user
            ? {
                id: session.user.id,
                email: session.user.email,
              }
            : null,
        );
        void fetchProfile(session?.user?.id ?? null);
        setLoading(false);
      }
    );

    const initializeSession = async () => {
      setLoading(true);

      if (hasAuthParams) {
        for (let attempt = 0; attempt < 12; attempt += 1) {
          const { data, error } = await supabase.auth.getSession();

          if (error) {
            console.error("Auth initialization failed:", error);
            break;
          }

          if (data.session) {
            if (!mounted) return;
            setSession(data.session);
            Sentry.setUser({
              id: data.session.user.id,
              email: data.session.user.email,
            });
            await fetchProfile(data.session.user.id);
            setLoading(false);
            return;
          }

          await wait(250);
        }
      }

      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error("Failed to get session:", error);
      }

      setSession(data.session);
      Sentry.setUser(
        data.session?.user
          ? {
              id: data.session.user.id,
              email: data.session.user.email,
            }
          : null,
      );
      await fetchProfile(data.session?.user?.id ?? null);
      setLoading(false);
    };

    void initializeSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        refreshProfile: async () => {
          await fetchProfile(session?.user?.id ?? null);
        },
        loading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
