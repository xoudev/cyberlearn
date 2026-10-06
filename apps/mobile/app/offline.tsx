import { useRouter } from "expo-router";
import React from "react";
import { Alert, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { Rise } from "@/components/anim";
import { ActionChip, BackButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { EmptyState } from "@/components/states";
import { Card, Divider, SectionLabel, Text } from "@/components/ui";
import { formatSize, OFFLINE_BUDGET, usedSpace } from "@/lib/offline";
import { useOfflineActions, useOfflineModules } from "@/lib/offline-store";

/**
 * Hors ligne: the modules saved on this phone, to read without a network.
 * Each lesson opens as usual; when the network does not answer, the lesson
 * screen reads the saved copy instead. A module is saved from its path
 * ("Lire hors ligne" under the module's header) and removed here or there.
 */
export default function OfflineScreen(): React.JSX.Element {
  const router = useRouter();
  const modules = useOfflineModules();
  const { remove } = useOfflineActions();
  const used = usedSpace(modules);

  const confirmRemove = (key: string, title: string): void => {
    Alert.alert("Retirer la copie hors ligne ?", title, [
      { text: "Annuler", style: "cancel" },
      { text: "Retirer", style: "destructive", onPress: () => void remove(key) },
    ]);
  };

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackButton />
      </View>
      <SectionLabel eyebrow="lecture sans réseau" title="Hors ligne." />
      <Text variant="bodySm" style={{ marginBottom: 14 }}>
        {`${formatSize(used)} utilisés sur ${formatSize(OFFLINE_BUDGET)}. La progression, les quiz et les notes attendent le réseau : ils se font au retour.`}
      </Text>

      {modules.length === 0 ? (
        <EmptyState
          title="Aucun module enregistré"
          body="Depuis un parcours, touche « Lire hors ligne » sous l'en-tête d'un module : ses leçons restent lisibles sans réseau."
        />
      ) : (
        <View style={{ gap: 12 }}>
          {modules.map((module, index) => {
            const label =
              module.moduleTitle ?? `Module ${String(module.moduleNumber).padStart(2, "0")}`;
            return (
              <Rise key={module.key} index={index}>
                <Card style={{ padding: 0 }}>
                  <View style={{ padding: 12, gap: 4 }}>
                    <Text variant="micro" style={{ color: colors.accent }}>
                      {module.pathTitle}
                    </Text>
                    <Text variant="h3">{label}</Text>
                    <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
                      {`${String(module.lessons.length)} leçon${module.lessons.length > 1 ? "s" : ""} · ${formatSize(module.size)} · enregistré le ${new Date(module.savedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`}
                    </Text>
                  </View>
                  {module.lessons.map((lesson) => (
                    <View key={lesson.slug}>
                      <Divider />
                      <ActionChipRow
                        title={lesson.title}
                        onPress={() => {
                          router.push({
                            pathname: "/lessons/[slug]",
                            params: { slug: lesson.slug },
                          });
                        }}
                      />
                    </View>
                  ))}
                  <Divider />
                  <View style={{ padding: 12, alignItems: "flex-start" }}>
                    <ActionChip
                      label="Retirer la copie"
                      tone="neutral"
                      onPress={() => {
                        confirmRemove(module.key, `${module.pathTitle} : ${label}`);
                      }}
                    />
                  </View>
                </Card>
              </Rise>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function ActionChipRow({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
      <ActionChip label={title} tone="neutral" onPress={onPress} />
    </View>
  );
}
