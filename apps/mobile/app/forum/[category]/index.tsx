import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { GradientButton, BackButton } from "@/components/buttons";
import { Pager, TopicRow } from "@/components/forum";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Text } from "@/components/ui";
import { topicCountLabel } from "@/lib/forum";
import { useForumSection } from "@/lib/queries";
import { useSession } from "@/lib/session";

/** One section: its threads, pinned first, then the busiest, a page at a time. */
export default function ForumSectionScreen(): React.JSX.Element {
  const { category } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();
  const { session } = useSession();
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useForumSection(session?.user.id, category, page);

  return (
    <Screen onRefresh={() => refetch()}>
      <View style={{ marginBottom: 16 }}>
        <BackButton label="Forum" />
      </View>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : error || !data ? (
        <ErrorState onRetry={() => void refetch()} code="FORUM_SECTION" />
      ) : (
        <View style={{ gap: 16 }}>
          <View style={{ gap: 6 }}>
            <Text variant="micro" style={{ color: data.category.accent }}>
              {`// Forum · ${topicCountLabel(data.category.topicCount)}`}
            </Text>
            <Text variant="display" style={{ fontSize: 26 }}>
              {data.category.name}
            </Text>
            <Text variant="body">{data.category.description}</Text>
          </View>

          <GradientButton
            label="Nouveau sujet"
            onPress={() => {
              router.push({ pathname: "/forum/compose", params: { category: data.category.slug } });
            }}
          />

          {data.topics.length === 0 ? (
            <EmptyState
              title="Aucun sujet pour l'instant"
              body="Ouvre le premier : une question précise attire des réponses précises."
            />
          ) : (
            <View style={{ gap: 10 }}>
              {data.topics.map((topic) => (
                <TopicRow key={topic.id} topic={topic} showCategory={false} />
              ))}
            </View>
          )}

          <Pager page={data.page} pages={data.pages} onChange={setPage} />
        </View>
      )}
    </Screen>
  );
}
