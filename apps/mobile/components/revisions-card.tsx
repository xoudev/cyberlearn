import { useRouter } from "expo-router";
import React from "react";
import { View, type ViewStyle } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { reviewDueLabel } from "@cyberlearn/lib/revisions/review-display";
import { PressableScale } from "@/components/anim";
import { Card, Pill, Text } from "@/components/ui";
import { useRevisions } from "@/lib/queries";
import { reviewSummary, splitReviews } from "@/lib/revisions";

/**
 * The home tab's way into the revisions, as the site's dashboard has one.
 * Nothing at all when spaced repetition is off: a switch that leaves the
 * surface in place reads as a switch that did nothing.
 */
export function RevisionsCard({
  userId,
  style,
}: {
  userId: string | undefined;
  /** Spacing belongs to the card: when it renders nothing, it takes no room. */
  style?: ViewStyle;
}): React.JSX.Element | null {
  const router = useRouter();
  const { data } = useRevisions(userId);
  if (!data?.enabled) return null;

  const now = new Date();
  const { due, upcoming } = splitReviews(data.items, now);
  if (due.length === 0 && upcoming.length === 0) return null;
  const summary = reviewSummary(due);
  const next = upcoming[0];

  return (
    <PressableScale
      style={style}
      onPress={() => router.push("/revisions")}
      accessibilityLabel={
        due.length > 0
          ? `${String(summary.count)} révisions à faire, environ ${String(summary.minutes)} minutes`
          : "Révisions : rien à faire aujourd'hui"
      }
    >
      <Card accent={due.length > 0 ? colors.warning : colors.borderDefault} style={{ gap: 6 }}>
        <View
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <Text
            variant="micro"
            style={{ color: due.length > 0 ? colors.warning : colors.textMuted }}
          >
            Révisions
          </Text>
          {due.length > 0 ? <Pill label="Réviser" color={colors.warning} active /> : null}
        </View>
        {due.length > 0 ? (
          <Text variant="h3">
            {summary.count} leçon{summary.count > 1 ? "s" : ""} à revoir · ~{summary.minutes} min
          </Text>
        ) : next ? (
          <Text variant="bodySm">
            Rien aujourd&apos;hui. Prochaine :{" "}
            {reviewDueLabel(new Date(next.nextReviewAt), now).text.toLowerCase()}.
          </Text>
        ) : null}
      </Card>
    </PressableScale>
  );
}
