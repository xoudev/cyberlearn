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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@cyberlearn/tokens";
import { BrandedLoader } from "@/components/loader";
import { TourProvider } from "@/components/tour";
import { mirrorInboxToDevice } from "@/lib/device-notifications";
import { ensureUserRow, useNotifications } from "@/lib/queries";
import { SessionProvider, useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } },
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

function RootNavigator(): React.JSX.Element {
  const { session, initializing } = useSession();
  const segments = useSegments();
  const router = useRouter();

  // Session gate: keep authed users inside the tabs, guests inside (auth).
  useEffect(() => {
    if (initializing) return;
    const inAuth = segments[0] === "(auth)";
    if (!session && !inAuth) {
      router.replace("/login");
    } else if (session && inAuth) {
      router.replace("/accueil");
    }
  }, [session, initializing, segments, router]);

  // On first authentication: make sure a public.users row exists, and route
  // un-onboarded users (no username) to the web onboarding gate.
  useEffect(() => {
    const user = session?.user;
    if (!user) return;
    let active = true;
    void (async () => {
      await ensureUserRow(user.id, user.email ?? "", user.email?.split("@")[0] ?? "Apprenti");
      const { data } = await supabase.from("users").select("username").eq("id", user.id).single();
      const username = (data as { username: string | null } | null)?.username ?? null;
      if (active && !username) router.replace("/onboarding-required");
    })();
    return () => {
      active = false;
    };
  }, [session?.user.id, router]);

  if (initializing) return <BrandedLoader label="Connexion" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgBase },
        animation: "fade",
      }}
    />
  );
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
            <TourProvider>
              <StatusBar style="light" />
              <NotificationMirror />
              <RootNavigator />
            </TourProvider>
          </SessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
