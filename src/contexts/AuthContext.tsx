import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const hasAuthParams =
      window.location.search.includes("code=") ||
      window.location.search.includes("access_token=") ||
      window.location.hash.includes("access_token=") ||
      window.location.pathname === "/auth/callback";

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setSession(session);
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
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
