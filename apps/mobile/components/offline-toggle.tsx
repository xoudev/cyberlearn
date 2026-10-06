import React, { useState } from "react";
import { Alert, Pressable } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";
import { formatSize, moduleKey } from "@/lib/offline";
import { useOfflineActions, useOfflineModules } from "@/lib/offline-store";

/**
 * Under a module's header on the path screen: save the module's lessons to
 * read them without a network, or remove the saved copy. One line, like the
 * revision sheet's link above it.
 */
export function OfflineToggle({
  pathSlug,
  pathTitle,
  moduleNumber,
  moduleTitle,
  lessonSlugs,
}: {
  pathSlug: string;
  pathTitle: string;
  moduleNumber: number;
  moduleTitle: string | null;
  lessonSlugs: readonly string[];
}): React.JSX.Element | null {
  const modules = useOfflineModules();
  const { save, remove } = useOfflineActions();
  const [busy, setBusy] = useState(false);
  const key = moduleKey(pathSlug, moduleNumber);
  const saved = modules.find((module) => module.key === key);

  if (lessonSlugs.length === 0) return null;

  const onPress = (): void => {
    if (busy) return;
    if (saved !== undefined) {
      Alert.alert(
        "Retirer la copie hors ligne ?",
        "Les leçons de ce module ne seront plus lisibles sans réseau.",
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Retirer",
            style: "destructive",
            onPress: () => {
              setBusy(true);
              void remove(key).finally(() => {
                setBusy(false);
              });
            },
          },
        ],
      );
      return;
    }
    setBusy(true);
    void save({ pathSlug, pathTitle, moduleNumber, moduleTitle }, lessonSlugs).then((result) => {
      setBusy(false);
      if (!result.ok) Alert.alert("Lecture hors ligne", result.error);
    });
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        saved !== undefined
          ? "Module enregistré pour lire hors ligne, toucher pour retirer la copie"
          : "Enregistrer le module pour lire hors ligne"
      }
      style={{ alignSelf: "flex-start", marginTop: 2 }}
    >
      <Text variant="micro" style={{ color: saved !== undefined ? colors.success : colors.accent }}>
        {busy
          ? "ENREGISTREMENT…"
          : saved !== undefined
            ? `✓ HORS LIGNE · ${formatSize(saved.size)} · RETIRER`
            : "LIRE HORS LIGNE ›"}
      </Text>
    </Pressable>
  );
}
