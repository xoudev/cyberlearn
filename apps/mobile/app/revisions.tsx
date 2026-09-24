import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import {
  REVIEW_GRADES,
  outcomeOf,
  reviewDueLabel,
  reviewMinutes,
  reviewOutcomeText,
  reviewXpFor,
  type ReviewOutcome,
  type ReviewQuality,
} from "@cyberlearn/lib/revisions/review-display";
import { Rise } from "@/components/anim";
import { ActionChip, BackButton, GradientButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, SectionLabel, StatCell, Text } from "@/components/ui";
import { gradeReviewApi } from "@/lib/api";
import { CATEGORY_COLOR, CATEGORY_LABEL } from "@/lib/db";
import { useRevisions } from "@/lib/queries";
import { reviewSummary, splitReviews, type ReviewItem } from "@/lib/revisions";
import { useSession } from "@/lib/session";

/**
 * Révisions: the site's /revisions. Lessons finished come back when they are
 * about to be forgotten (SM-2); the learner says how well they remembered, and
 * the server moves the next date and pays a tenth of the lesson's XP for a
 * recall. Honours the spacedRepetition switch like the site: off, the screen
 * says so and points to the settings, and the queue waits untouched.
 */

const GRADE_COLOR: Record<ReviewOutcome, string> = {
  forgot: colors.danger,
  hard: colors.warning,
  easy: colors.success,
};

export default function Revisions(): React.JSX.Element {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data, isLoading, error, refetch } = useRevisions(userId);
  const now = new Date();

  return (
    <Screen onRefresh={() => refetch()}>
      <View style={{ marginBottom: 16 }}>
        <BackButton />
      </View>
      <SectionLabel eyebrow="Session · SM-2" title="Révisions" />

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : error || !data ? (
        <ErrorState onRetry={() => void refetch()} code="REVISIONS_LOAD" />
      ) : !data.enabled ? (
        <Card style={{ gap: 10 }}>
          <Text variant="h3">Les révisions sont coupées</Text>
          <Text variant="body">
            Tu as désactivé la répétition espacée. Rien n&apos;est perdu : ce que tu avais à réviser
            t&apos;attend si tu la réactives.
          </Text>
          <GradientButton label="Ouvrir les réglages" onPress={() => router.push("/settings")} />
        </Card>
      ) : (
        <RevisionsBody items={data.items} now={now} />
      )}
    </Screen>
  );
}

function RevisionsBody({ items, now }: { items: ReviewItem[]; now: Date }): React.JSX.Element {
  const { due, upcoming } = splitReviews(items, now);
  const summary = reviewSummary(due);
  const next = upcoming[0];

  return (
    <View style={{ gap: 18 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <StatCell value={summary.count} label="À réviser" accent={colors.accent} />
        <StatCell value={`${String(summary.minutes)} min`} label="Environ" />
        <StatCell value={`+${String(summary.xp)}`} label="XP max" />
      </View>

      {due.length === 0 ? (
        <EmptyState
          title="Rien à réviser aujourd'hui"
          body={
            next
              ? `Prochaine révision : ${reviewDueLabel(new Date(next.nextReviewAt), now).text.toLowerCase()}, « ${next.title} ».`
              : "Termine une leçon : elle reviendra ici au moment où tu risques de l'oublier."
          }
        />
      ) : (
        <View style={{ gap: 12 }}>
          <Text variant="bodySm">
            Relis la leçon si besoin, puis dis honnêtement comment tu l&apos;as retenue : c&apos;est
            ce qui règle la prochaine date.
          </Text>
          {due.map((item, i) => (
            <Rise key={item.scheduleId} index={i}>
              <ReviewCard item={item} now={now} />
            </Rise>
          ))}
        </View>
      )}

      {upcoming.length > 0 ? (
        <View style={{ gap: 8 }}>
          <SectionLabel title="Ensuite" />
          {upcoming.map((item) => (
            <View
              key={item.scheduleId}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 12,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: colors.borderSubtle,
              }}
            >
              <Text variant="body" style={{ flex: 1, color: colors.textPrimary }} numberOfLines={2}>
                {item.title}
              </Text>
              <Text variant="mono" style={{ fontSize: 11 }}>
                {reviewDueLabel(new Date(item.nextReviewAt), now).text}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ReviewCard({ item, now }: { item: ReviewItem; now: Date }): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ outcome: ReviewOutcome; xp: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cat = CATEGORY_COLOR[item.category];
  const xp = reviewXpFor(item.xpReward);

  async function grade(quality: ReviewQuality): Promise<void> {
    if (sending || done) return;
    setSending(true);
    setError(null);
    const reply = await gradeReviewApi(item.scheduleId, quality);
    setSending(false);
    if (reply.ok) {
      setDone({ outcome: outcomeOf(quality), xp: reply.reviewXp });
      // XP and level show elsewhere; the queue itself is refetched on leaving.
      void queryClient.invalidateQueries({ queryKey: ["dashboard", session?.user.id] });
      void queryClient.invalidateQueries({ queryKey: ["profile", session?.user.id] });
    } else {
      setError(reply.error);
    }
  }

  return (
    <Card accent={done ? GRADE_COLOR[done.outcome] : cat} style={{ gap: 10 }}>
      <Text variant="micro" style={{ color: cat }}>
        {CATEGORY_LABEL[item.category]} · {reviewDueLabel(new Date(item.nextReviewAt), now).text}
      </Text>
      <Text variant="h3">{item.title}</Text>
      <Text variant="mono" style={{ fontSize: 11 }}>
        ~{reviewMinutes(item.difficulty)} min · +{xp} XP si retenue
      </Text>

      {done ? (
        <Text
          variant="body"
          accessibilityLiveRegion="polite"
          style={{ color: GRADE_COLOR[done.outcome] }}
        >
          {reviewOutcomeText(done.outcome, done.xp)}
        </Text>
      ) : (
        <>
          <View style={{ alignSelf: "flex-start" }}>
            <ActionChip
              label="Relire la leçon"
              tone="neutral"
              onPress={() =>
                router.push({ pathname: "/lessons/[slug]", params: { slug: item.slug } })
              }
            />
          </View>
          <Text variant="bodySm">Comment tu l&apos;as retenue ?</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {REVIEW_GRADES.map((g) => (
              <Pressable
                key={g.quality}
                onPress={() => void grade(g.quality)}
                disabled={sending}
                accessibilityRole="button"
                accessibilityLabel={`${g.label} : noter cette révision`}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: GRADE_COLOR[g.outcome],
                  backgroundColor: pressed ? `${GRADE_COLOR[g.outcome]}22` : "transparent",
                  opacity: sending ? 0.5 : 1,
                })}
              >
                <Text variant="micro" style={{ color: GRADE_COLOR[g.outcome], letterSpacing: 1 }}>
                  {g.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {error !== null ? (
            <Text variant="bodySm" style={{ color: colors.danger }} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
        </>
      )}
    </Card>
  );
}
