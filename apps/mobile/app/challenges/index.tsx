import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { PressableScale } from "@/components/anim";
import { BackButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, Pill, Text } from "@/components/ui";
import { DIFFICULTY_LABEL, STATUS_META } from "@/lib/challenges";
import { useCosmetics } from "@/lib/cosmetics";
import { useChallenges } from "@/lib/queries";
import { useSession } from "@/lib/session";

/**
 * The site's /challenges: every active challenge, where the learner stands on
 * it, and what locks it. A challenge opens on its own screen.
 */
export default function ChallengesList(): React.JSX.Element {
  const router = useRouter();
  const { theme } = useCosmetics();
  const { session } = useSession();
  const { data, isLoading, error, refetch } = useChallenges(session?.user.id);
  const solved = data?.filter((c) => c.displayStatus === "COMPLETED").length ?? 0;

  return (
    <Screen onRefresh={() => refetch()}>
      <View style={{ marginBottom: 16 }}>
        <BackButton />
      </View>
      <View style={{ gap: 8, marginBottom: 20 }}>
        <Text variant="micro" style={{ color: theme.accent }}>
          {`// Défis · ${String(solved)} résolu${solved > 1 ? "s" : ""}`}
        </Text>
        <Text variant="display" style={{ fontSize: 28 }}>
          Défis
        </Text>
        <Text variant="body">
          Des flags à trouver. Les défis sur machine Linux se jouent sur le site ; le flag se donne
          ici ou là-bas.
        </Text>
      </View>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : error || !data ? (
        <ErrorState onRetry={() => void refetch()} code="CHALLENGES_LOAD" />
      ) : data.length === 0 ? (
        <EmptyState
          title="Les défis arrivent"
          body="Le catalogue est en préparation. Les premiers défis seront ici dès leur publication."
        />
      ) : (
        <View style={{ gap: 10 }}>
          {data.map((challenge) => {
            const status = STATUS_META[challenge.displayStatus];
            return (
              <PressableScale
                key={challenge.id}
                accessibilityLabel={`${challenge.title}, ${status.label}`}
                onPress={() => {
                  router.push({ pathname: "/challenges/[slug]", params: { slug: challenge.slug } });
                }}
              >
                <Card style={{ gap: 6, opacity: challenge.displayStatus === "LOCKED" ? 0.6 : 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Pill label={status.label} color={status.color} />
                    <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
                      {`${challenge.refCode} · ${DIFFICULTY_LABEL[challenge.difficulty]} · ${String(challenge.xpReward)} XP`}
                    </Text>
                  </View>
                  <Text variant="h3">{challenge.title}</Text>
                  <Text variant="bodySm" style={{ color: colors.textSecondary }} numberOfLines={3}>
                    {challenge.description}
                  </Text>
                  {challenge.displayStatus === "LOCKED" && challenge.lockedByTitle !== null ? (
                    <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
                      {`Après « ${challenge.lockedByTitle} »`}
                    </Text>
                  ) : null}
                </Card>
              </PressableScale>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
