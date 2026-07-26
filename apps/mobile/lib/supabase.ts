import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { AppState } from "react-native";
import { sessionStorage } from "@/lib/session-storage";

const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};
const supabaseUrl = extra.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = extra.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

if (__DEV__ && (!supabaseUrl || !supabaseAnonKey)) {
  // Surfaced early so a missing apps/mobile/.env.local is obvious in dev logs.
  console.warn("[supabase] EXPO_PUBLIC_SUPABASE_URL / ANON_KEY manquant(s).");
}

// One anon client for the whole app. The user JWT is attached automatically to
// every PostgREST/RPC call once signed in; RLS does the authorization.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorage,
    // SessionProvider validates the persisted session before enabling the
    // foreground refresh loop. This avoids Supabase's startup recovery logging
    // an invalid refresh token left by a revoked or deleted session.
    autoRefreshToken: false,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

let authAutoRefreshEnabled = false;

function syncAuthAutoRefresh(): void {
  const operation =
    authAutoRefreshEnabled && AppState.currentState === "active"
      ? supabase.auth.startAutoRefresh()
      : supabase.auth.stopAutoRefresh();
  void operation.catch(() => undefined);
}

/** Enables refresh only after SessionProvider has restored a valid session. */
export function setAuthAutoRefreshEnabled(enabled: boolean): void {
  authAutoRefreshEnabled = enabled;
  syncAuthAutoRefresh();
}

// Refresh tokens only while a validated session is foregrounded.
AppState.addEventListener("change", (state) => {
  if (state === "active" || state === "background" || state === "inactive") {
    syncAuthAutoRefresh();
  }
});
