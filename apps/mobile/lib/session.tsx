import type { Session } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setInitializing(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, initializing }}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
