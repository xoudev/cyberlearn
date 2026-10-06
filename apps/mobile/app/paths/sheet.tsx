import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Pressable, Share, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { sheetAsText, sheetSummary } from "@cyberlearn/lib/paths/sheet";
import { Rise } from "@/components/anim";
import { BackButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/states";
import { Card, Text } from "@/components/ui";
import { fetchSheetApi } from "@/lib/api";

/**
 * The revision sheet of a module: what the site prints as a PDF, on screen.
 * The "à retenir" points of each lesson of the module, built on the server
 * from the lessons (@cyberlearn/lib/paths/sheet), and a share button that
 * hands the same words to any app.
 */
export default function SheetScreen(): React.JSX.Element {
  const { slug, module, title } = useLocalSearchParams<{
    slug: string;
    module: string;
    title?: string;
  }>();
  const number = Number(module);
  const ready = Boolean(slug) && Number.isInteger(number) && number > 0;
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["sheet", slug, number],
    enabled: ready,
    queryFn: () => fetchSheetApi(slug ?? "", number),
  });

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackButton label={title ?? "Parcours"} />
      </View>

      {!ready || error ? (
        <ErrorState onRetry={() => void refetch()} code="SHEET_LOAD" />
      ) : isLoading || !data ? (
        <ListSkeleton rows={4} />
      ) : (
        <View style={{ gap: 12 }}>
          <Rise index={0}>
            <Card accent={colors.accent} style={{ gap: 6 }}>
              <Text variant="micro" style={{ color: colors.accent, letterSpacing: 1.5 }}>
                FICHE DE RÉVISION
              </Text>
              <Text variant="bodySm" style={{ color: colors.textSecondary }}>
                {data.pathTitle}
              </Text>
              <Text variant="h1">{data.title}</Text>
              <Text variant="bodySm">{sheetSummary(data)}</Text>
              <Pressable
                onPress={() => {
                  void Share.share({ message: sheetAsText(data) });
                }}
                accessibilityRole="button"
                accessibilityLabel="Partager la fiche"
                style={{
                  alignSelf: "flex-start",
                  marginTop: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: colors.accent,
                }}
              >
                <Text variant="bodySm" style={{ color: colors.accent }}>
                  Partager en texte
                </Text>
              </Pressable>
            </Card>
          </Rise>

          {data.sections.length === 0 ? (
            <Card>
              <Text variant="bodySm">
                Aucune leçon de ce module n&apos;a encore de récapitulatif.
              </Text>
            </Card>
          ) : null}

          {data.sections.map((section, k) => (
            <Rise key={k} index={k + 1}>
              <Card style={{ gap: 8 }}>
                <Text variant="h3">{section.lessonTitle}</Text>
                {section.points.map((point, p) => (
                  <View key={p} style={{ flexDirection: "row", gap: 8 }}>
                    <Text variant="body" style={{ color: colors.accent }}>
                      •
                    </Text>
                    <Text variant="body" style={{ flex: 1 }}>
                      {point}
                    </Text>
                  </View>
                ))}
              </Card>
            </Rise>
          ))}
        </View>
      )}
    </Screen>
  );
}
