import { useQuery } from "@tanstack/react-query";
import React from "react";
import { View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { BackButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/states";
import { SectionLabel, Text } from "@/components/ui";
import { fetchModerationRecordApi } from "@/lib/api";
import {
  MODERATION_RECORD_EMPTY,
  MODERATION_RECORD_INTRO,
  moderationOutcome,
  recordStamp,
  surfaceNoun,
} from "@/lib/moderation-record";

/**
 * The reader's own moderation record: the site's /settings/moderation. When,
 * where, what was flagged and how it ended; never the score or the rules that
 * fired. It exists because the notices point somewhere: "ta réponse a été
 * supprimée" with no way to see which one reads as an accusation rather than
 * an explanation.
 */
export default function ModerationRecord(): React.JSX.Element {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["moderation-record"],
    queryFn: fetchModerationRecordApi,
  });

  return (
    <Screen onRefresh={() => refetch()}>
      <View style={{ marginBottom: 16 }}>
        <BackButton />
      </View>
      <SectionLabel eyebrow="Modération" title="Ce qui a été signalé" />
      <Text variant="body" style={{ color: colors.textSecondary, marginBottom: 18 }}>
        {MODERATION_RECORD_INTRO}
      </Text>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : error || !data ? (
        <ErrorState onRetry={() => void refetch()} code="MODERATION_LOAD" />
      ) : data.length === 0 ? (
        <View style={{ borderWidth: 1, borderColor: colors.borderSubtle, padding: 18 }}>
          <Text variant="mono" style={{ fontSize: 12, color: colors.textMuted }}>
            {`// ${MODERATION_RECORD_EMPTY}`}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {data.map((event) => {
            const outcome = moderationOutcome(event.outcome);
            return (
              <View
                key={event.id}
                style={{
                  borderWidth: 1,
                  borderColor: colors.borderSubtle,
                  borderLeftWidth: 2,
                  borderLeftColor: outcome.color,
                  backgroundColor: "rgba(5,4,26,0.5)",
                  padding: 14,
                  gap: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    gap: 4,
                  }}
                >
                  <Text variant="micro">{surfaceNoun(event.surface)}</Text>
                  <Text variant="micro">{recordStamp(event.createdAt)}</Text>
                </View>
                <Text variant="bodySm" selectable style={{ color: colors.textSecondary }}>
                  {event.excerpt}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  <Text variant="mono" style={{ fontSize: 11, color: outcome.color }}>
                    {outcome.label}
                  </Text>
                  {event.reviewedAt !== null ? (
                    <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
                      {`le ${recordStamp(event.reviewedAt)}`}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
