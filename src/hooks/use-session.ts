/** Client-side session hook backed by persisted auth state. */
import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      setUser(next?.user ?? null);
      setLoading(false);
    });

    void supabase.auth
      .getSession()
      .then(async ({ data }) => {
        const { data: userData, error } = await supabase.auth.getUser();
        if (!active) return;
        if (error || !userData.user) {
          setSession(null);
          setUser(null);
        } else {
          setSession(data.session);
          setUser(userData.user);
        }
        setLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        if (import.meta.env.DEV) console.warn("[TruthGuard Auth] Session check failed", error);
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { session, user, loading };
}
