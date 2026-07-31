/** Client-side session hook backed by the local (localStorage) user store. */
import { useCallback, useEffect, useState } from "react";
import { SESSION_EVENT, getCurrentUser, type LocalUser } from "@/lib/local-db";

export function useSession() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  const sync = useCallback(() => {
    setUser(getCurrentUser());
    setLoading(false);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener(SESSION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SESSION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [sync]);

  return { user, loading };
}
