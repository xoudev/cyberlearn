import * as WebBrowser from "expo-web-browser";
import React from "react";
import { Pressable, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { Screen } from "@/components/screen";
import { Text } from "@/components/ui";
import { supabase } from "@/lib/supabase";

export default function OnboardingRequired(): React.JSX.Element {
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: "center", gap: 16 }}>
        <Text variant="micro" style={{ color: colors.accent }}>
          Presque prêt
        </Text>
        <Text variant="h1">Termine ton inscription</Text>
        <Text variant="body">
          Ton compte n&apos;a pas encore de pseudo. Finalise ton profil (pseudo, test de placement,
          avatar) sur cyberlearn.fr, puis reviens ici.
        </Text>
        <Pressable
          onPress={() => void WebBrowser.openBrowserAsync("https://cyberlearn.fr/onboarding")}
          style={{
            height: 48,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.accent,
            marginTop: 8,
          }}
        >
          <Text variant="micro" style={{ color: colors.bgBase }}>
            Ouvrir cyberlearn.fr
          </Text>
        </Pressable>
        <Pressable onPress={() => void supabase.auth.signOut()} style={{ marginTop: 4 }}>
          <Text variant="micro" style={{ textAlign: "center" }}>
            Se déconnecter
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
