import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { PressableScale } from "@/components/anim";
import { BackButton } from "@/components/buttons";
import { TopicRow } from "@/components/forum";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, SectionLabel, Text } from "@/components/ui";
import { forumDate, topicCountLabel } from "@/lib/forum";
import { useCosmetics } from "@/lib/cosmetics";
import { useForum } from "@/lib/queries";
import { useSession } from "@/lib/session";

/** The forum's front page: the site's /forum, its sections and latest threads. */
export default function ForumHome(): React.JSX.Element {
  const router = useRouter();
  const { theme } = useCosmetics();
  const { session } = useSession();
  const { data, isLoading, error, refetch } = useForum(session?.user.id);

  return (
    <Screen onRefresh={() => refetch()}>
      <View style={{ marginBottom: 16 }}>
        <BackButton />
      </View>

      <View style={{ gap: 8, marginBottom: 22 }}>
        <Text variant="micro" style={{ color: theme.accent }}>
          {"// Cyber Learn · Communauté"}
        </Text>
        <Text variant="display" style={{ fontSize: 28 }}>
          Le forum
        </Text>
        <Text variant="body">
          Une question sur une leçon, un outil à partager, un lab qui ne veut pas démarrer :
          c&apos;est ici, et c&apos;est lu par tout le monde plutôt que par une seule classe.
        </Text>
      </View>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : error || !data ? (
        <ErrorState onRetry={() => void refetch()} code="FORUM_LOAD" />
      ) : (
        <View style={{ gap: 24 }}>
          <View style={{ gap: 10 }}>
            {data.categories.map((category) => (
              <PressableScale
                key={category.slug}
                accessibilityLabel={`${category.name}, ${topicCountLabel(category.topicCount)}`}
                onPress={() => {
                  router.push({
                    pathname: "/forum/[category]",
                    params: { category: category.slug },
                  });
                }}
              >
                <Card accent={category.accent} style={{ gap: 6 }}>
                  <Text variant="h2">{category.name}</Text>
                  <Text variant="bodySm">{category.description}</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text variant="mono" style={{ fontSize: 10.5, color: category.accent }}>
                      {topicCountLabel(category.topicCount)}
                    </Text>
                    {/* An empty section says so rather than showing a date it
                        does not have. */}
                    <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
                      {category.lastPostAt ? forumDate(category.lastPostAt) : "rien encore"}
                    </Text>
                  </View>
                </Card>
              </PressableScale>
            ))}
          </View>

          <View>
            <SectionLabel title="Derniers messages" />
            {data.recent.length === 0 ? (
              <EmptyState
                title="Personne n'a encore écrit"
                body="Ouvre le premier sujet dans une section ci-dessus."
              />
            ) : (
              <View style={{ gap: 10 }}>
                {data.recent.map((topic) => (
                  <TopicRow key={topic.id} topic={topic} />
                ))}
              </View>
            )}
          </View>
        </View>
      )}
    </Screen>
  );
}
