import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { Screen } from "@/components/screen";
import { Text } from "@/components/ui";

export default function PathDetail(): React.JSX.Element {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <Text variant="micro">← Retour</Text>
      </Pressable>
      <View style={{ marginTop: 28, gap: 12 }}>
        <Text variant="h1">Détail parcours</Text>
        <Text variant="body">
          Le détail du parcours « {slug} » (objectifs, missions, timeline) arrive en Phase 2.
        </Text>
      </View>
    </Screen>
  );
}
