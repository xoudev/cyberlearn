// Must be the first import (native side-effect for gesture handling).
import "react-native-gesture-handler";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@cyberlearn/tokens";
import { BrandedLoader } from "@/components/loader";
import { TourProvider } from "@/components/tour";
import { useReducedMotionPreference } from "@/lib/accessibility";
import { CosmeticsProvider } from "@/lib/cosmetics";
import { mirrorInboxToDevice } from "@/lib/device-notifications";
import { ensureUserRow, useNotifications } from "@/lib/queries";
import { SessionProvider, useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useActiveBan } from "@/lib/use-active-ban";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 120_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

/** Mirrors fresh inbox items to the device notification tray (60s polling). */
function NotificationMirror(): null {
  const { session } = useSession();
  const { data } = useNotifications(session?.user.id);
  useEffect(() => {
    if (data && data.length > 0) void mirrorInboxToDevice(data);
  }, [data]);
  return null;
}

/** Prevents one signed-in account from seeing another account's cached data. */
function SessionCacheBoundary(): null {
  const { session, initializing } = useSession();
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (initializing) return;
    const userId = session?.user.id ?? null;
    if (previousUserId.current === undefined) {
      previousUserId.current = userId;
      return;
    }
    if (previousUserId.current !== userId) {
      queryClient.clear();
      previousUserId.current = userId;
    }
  }, [initializing, queryClient, session?.user.id]);

  return null;
}

function RootNavigator(): React.JSX.Element {
  const reducedMotion = useReducedMotionPreference();
  const { session, initializing } = useSession();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const [assessedAccessToken, setAssessedAccessToken] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const assuranceChecking = Boolean(session && assessedAccessToken !== session.access_token);

  useEffect(() => {
    let active = true;
    if (!session) {
      setMfaRequired(false);
      setAssessedAccessToken(null);
      return () => {
        active = false;
      };
    }

    const accessToken = session.access_token;
    void supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data, error }) => {
      if (!active) return;
      setMfaRequired(error ? true : data.nextLevel === "aal2" && data.currentLevel !== "aal2");
      setAssessedAccessToken(accessToken);
    });
    return () => {
      active = false;
    };
  }, [session?.access_token]);

  // Session gate: authenticated users with an enrolled TOTP factor must reach
  // AAL2 before any application screen or query is mounted.
  useEffect(() => {
    if (initializing || assuranceChecking) return;
    const inAuth = segments[0] === "(auth)";
    const inMfaChallenge = pathname === "/mfa";
    if (!session && !inAuth) {
      router.replace("/login");
    } else if (session && mfaRequired && !inMfaChallenge) {
      router.replace("/mfa");
    } else if (session && !mfaRequired && inAuth) {
      router.replace("/home");
    }
  }, [session, initializing, assuranceChecking, mfaRequired, segments, pathname, router]);

  // On first authentication: make sure a public.users row exists, and route
  // un-onboarded users (no username) to the web onboarding gate.
  useEffect(() => {
    const user = session?.user;
    if (!user || assuranceChecking || mfaRequired) return;
    let active = true;
    void (async () => {
      await ensureUserRow(user.id, user.email ?? "", user.email?.split("@")[0] ?? "Apprenti");
      const { data } = await supabase.from("users").select("username").eq("id", user.id).single();
      const username = readUsername(data);
      if (active && !username) router.replace("/onboarding-required");
    })();
    return () => {
      active = false;
    };
  }, [session?.user.id, assuranceChecking, mfaRequired, router]);

  // Ban gate: a banned account sees one screen, /banned, as on the site. The
  // server refuses it anyway; this is so the app says why. Read after MFA, like
  // everything else the account owns.
  const signedIn = Boolean(session && !mfaRequired && !assuranceChecking);
  const banQuery = useActiveBan(signedIn ? session?.user.id : undefined);
  const ban = banQuery.data;
  useEffect(() => {
    if (!signedIn || ban === undefined) return;
    const onBanned = pathname === "/banned";
    if (ban && !onBanned) router.replace("/banned");
    else if (!ban && onBanned) router.replace("/home");
  }, [signedIn, ban, pathname, router]);

  if (initializing || assuranceChecking || (signedIn && banQuery.isLoading)) {
    return <BrandedLoader label="Connexion sécurisée" />;
  }

  return (
    <CosmeticsProvider userId={session && !mfaRequired ? session.user.id : undefined}>
      {session && !mfaRequired ? <NotificationMirror /> : null}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bgBase },
          animation: reducedMotion ? "none" : "fade",
        }}
      />
    </CosmeticsProvider>
  );
}

function readUsername(value: unknown): string | null {
  if (typeof value !== "object" || value === null || !("username" in value)) return null;
  return typeof value.username === "string" && value.username.length > 0 ? value.username : null;
}

export default function RootLayout(): React.JSX.Element | null {
  const [loaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <SessionCacheBoundary />
            <TourProvider>
              <StatusBar style="light" />
              <RootNavigator />
            </TourProvider>
          </SessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
