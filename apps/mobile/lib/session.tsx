import type { Session } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useState } from "react";
import { isInvalidRefreshTokenError } from "@/lib/auth-errors";
import { setAuthAutoRefreshEnabled, supabase } from "@/lib/supabase";

interface SessionState {
  session: Session | null;
  initializing: boolean;
}

const SessionContext = createContext<SessionState>({ session: null, initializing: true });

/** Holds the Supabase session and keeps it in sync with auth state changes. */
export function SessionProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    function subscribeToAuthChanges(): void {
      if (!active || unsubscribe) return;
      const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
        setAuthAutoRefreshEnabled(Boolean(next));
        setSession(next);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    }

    void (async () => {
      try {
        subscribeToAuthChanges();
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;

        let restoredSession = error ? null : data.session;
        if (error && isInvalidRefreshTokenError(error)) {
          await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
        } else if (restoredSession) {
          const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession({
            refresh_token: restoredSession.refresh_token,
          });
          if (!active) return;

          if (refreshError && isInvalidRefreshTokenError(refreshError)) {
            await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
            restoredSession = null;
          } else if (refreshed.session) {
            restoredSession = refreshed.session;
          }
        }

        setAuthAutoRefreshEnabled(Boolean(restoredSession));
        setSession(restoredSession);
      } catch {
        if (!active) return;
        subscribeToAuthChanges();
        setAuthAutoRefreshEnabled(false);
        setSession(null);
      } finally {
        if (active) setInitializing(false);
      }
    })();

    return () => {
      active = false;
      setAuthAutoRefreshEnabled(false);
      unsubscribe?.();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, initializing }}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
