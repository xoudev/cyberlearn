import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { BackButton, GradientButton } from "@/components/buttons";
import { MessageInput } from "@/components/forum";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/states";
import { Text } from "@/components/ui";
import { createForumTopicApi } from "@/lib/api";
import { BODY_MAX, TITLE_MAX, threadFromHref, topicDraftProblem } from "@/lib/forum";
import { useForumSection } from "@/lib/queries";
import { useSession } from "@/lib/session";

/**
 * A new thread in a section: the site's /forum/<section>/nouveau. The section
 * is read first, as on the site, so the screen never invites a post into one
 * that does not exist.
 */
export default function ForumCompose(): React.JSX.Element {
  const { category } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const { data, error: loadError, refetch } = useForumSection(session?.user.id, category, 1);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publish = async (): Promise<void> => {
    if (!data || sending) return;
    const problem = topicDraftProblem(title, content);
    if (problem !== null) {
      setError(problem);
      return;
    }
    setSending(true);
    setError(null);
    const reply = await createForumTopicApi({
      categorySlug: data.category.slug,
      title: title.trim(),
      content: content.trim(),
    });
    setSending(false);
    const thread = reply.ok && reply.href ? threadFromHref(reply.href) : null;
    if (!reply.ok || !thread) {
      setError(reply.error ?? "Le sujet n'a pas pu être publié. Réessaie.");
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["forum"] });
    void queryClient.invalidateQueries({ queryKey: ["forum-section"] });
    router.replace({
      pathname: "/forum/[category]/[topic]",
      params: {
        category: thread.category,
        topic: thread.slug,
        ...(reply.heldForReview === true ? { held: "1" } : {}),
      },
    });
  };

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackButton label={data?.category.name ?? "Forum"} />
      </View>

      {!data ? (
        loadError ? (
          <ErrorState onRetry={() => void refetch()} code="FORUM_COMPOSE" />
        ) : (
          <ListSkeleton rows={2} />
        )
      ) : (
        <View style={{ gap: 16 }}>
          <View style={{ gap: 6 }}>
            <Text variant="micro" style={{ color: data.category.accent }}>
              {`// ${data.category.name}`}
            </Text>
            <Text variant="display" style={{ fontSize: 26 }}>
              Nouveau sujet
            </Text>
            <Text variant="body">Tout le monde sur la plateforme peut le lire et y répondre.</Text>
          </View>

          <View style={{ gap: 6 }}>
            <Text variant="micro">Titre</Text>
            <MessageInput
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                setError(null);
              }}
              multiline={false}
              minHeight={48}
              maxLength={TITLE_MAX}
              placeholder={`Ta question dans ${data.category.name}`}
              accessibilityLabel="Titre du sujet"
            />
            <Text variant="bodySm">
              Une phrase qui dit de quoi il s&apos;agit. C&apos;est ce que les autres verront dans
              la liste.
            </Text>
          </View>

          <View style={{ gap: 6 }}>
            <Text variant="micro">Message</Text>
            <MessageInput
              value={content}
              onChangeText={(text) => {
                setContent(text);
                setError(null);
              }}
              minHeight={180}
              maxLength={BODY_MAX}
              placeholder="Explique le contexte, ce que tu as déjà essayé, et où ça coince."
              accessibilityLabel="Message"
            />
            <Text variant="bodySm">
              Markdown accepté : **gras**, `code`, listes, liens et blocs ```.
            </Text>
          </View>

          {error !== null ? (
            <Text
              variant="bodySm"
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={{ color: colors.danger }}
            >
              {error}
            </Text>
          ) : null}

          <GradientButton
            label={sending ? "Publication…" : "Publier le sujet"}
            disabled={sending}
            onPress={() => void publish()}
          />
        </View>
      )}
    </Screen>
  );
}
