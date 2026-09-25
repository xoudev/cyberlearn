import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { ActionChip, BackButton } from "@/components/buttons";
import { PathGuideFlow } from "@/components/path-guide";
import { Screen } from "@/components/screen";
import { SectionLabel } from "@/components/ui";

/**
 * "Trouver mon parcours": the site's /paths/guide. Two questions, then two or
 * three paths with the reason each was picked. Nothing is recorded.
 */
export default function PathGuide(): React.JSX.Element {
  const router = useRouter();

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackButton label="Parcours" />
      </View>
      <SectionLabel eyebrow="Guide" title="Trouver ton parcours" />

      <PathGuideFlow
        intro="Deux questions pour te proposer par où commencer. Ce sont des suggestions : tout le catalogue reste ouvert."
        chooseLabel="Voir ce parcours"
        onChoose={(slug) => router.push({ pathname: "/paths/[slug]", params: { slug } })}
        footer={() => (
          <View style={{ alignSelf: "flex-start", marginTop: 8 }}>
            <ActionChip label="Tout le catalogue" tone="neutral" onPress={() => router.back()} />
          </View>
        )}
      />
    </Screen>
  );
}
