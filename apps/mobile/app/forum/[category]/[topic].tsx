import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { AppModal } from "@/components/app-modal";
import { ActionChip, BackButton, GradientButton } from "@/components/buttons";
import { ForumTag, HeldNotice, MessageInput, Pager } from "@/components/forum";
import { Avatar } from "@/components/media";
import { NoteMarkdown } from "@/components/note-markdown";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/states";
import { Card, Text } from "@/components/ui";
import { editForumPostApi, hideForumPostApi, replyInForumApi, type ForumThread } from "@/lib/api";
import {
  BODY_MAX,
  canEditPost,
  canRemovePost,
  forumDate,
  postDraftProblem,
  roleLabel,
  type ForumPost,
} from "@/lib/forum";
import { useCosmetics } from "@/lib/cosmetics";
import { useForumThread } from "@/lib/queries";
import { useSession } from "@/lib/session";

/**
 * One thread: the site's /forum/<section>/<thread>. Its posts a page at a time,
 * the reader's own to edit or take down, an administrator's right to take any
 * down, and the reply box, unless the thread is closed.
 */
export default function ForumThreadScreen(): React.JSX.Element {
  const { category, topic, held } = useLocalSearchParams<{
    category: string;
    topic: string;
    /** Set by the composer when the opening post was held for review. */
    held?: string;
  }>();
  const { session } = useSession();
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useForumThread(
    session?.user.id,
    category,
    topic,
    page,
  );

  return (
    <Screen onRefresh={() => refetch()}>
      <View style={{ marginBottom: 16 }}>
        <BackButton label={data?.topic.categoryName ?? "Forum"} />
      </View>
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : error || !data ? (
        <ErrorState onRetry={() => void refetch()} code="FORUM_THREAD" />
      ) : (
        <ThreadBody
          thread={data}
          openedHeld={held === "1"}
          onPage={setPage}
          onChanged={async () => {
            const next = await refetch();
            return next.data?.pages ?? data.pages;
          }}
        />
      )}
    </Screen>
  );
}

function ThreadBody({
  thread,
  openedHeld,
  onPage,
  onChanged,
}: {
  thread: ForumThread;
  openedHeld: boolean;
  onPage: (page: number) => void;
  /** Fetches the thread again; resolves with its page count. */
  onChanged: () => Promise<number>;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const { topic, posts, viewer } = thread;

  const touched = async (): Promise<number> => {
    // The lists order by the latest activity and count replies.
    void queryClient.invalidateQueries({ queryKey: ["forum"] });
    void queryClient.invalidateQueries({ queryKey: ["forum-section"] });
    return onChanged();
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
          {topic.pinned ? <ForumTag kind="pinned" /> : null}
          {topic.locked ? <ForumTag kind="locked" /> : null}
          <Text variant="micro" style={{ color: topic.categoryAccent }}>
            Ouvert par {topic.author?.name ?? "Compte supprimé"} · {forumDate(topic.createdAt)}
          </Text>
        </View>
        <Text variant="display" style={{ fontSize: 24 }}>
          {topic.title}
        </Text>
      </View>

      {openedHeld ? <HeldNotice /> : null}

      <View style={{ gap: 12 }}>
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            viewerIsAdmin={viewer.isAdmin}
            onChanged={() => void touched()}
          />
        ))}
      </View>

      <Pager page={thread.page} pages={thread.pages} onChange={onPage} />

      {/* A closed thread keeps its messages and loses its box: the alternative
          is a form that accepts input and then refuses it. */}
      {topic.locked ? (
        <Card>
          <Text variant="bodySm">
            Ce sujet est fermé. Il reste lisible, mais on n&apos;y répond plus.
          </Text>
        </Card>
      ) : (
        <ReplyBox
          topicId={topic.id}
          onReplied={async () => {
            // The reply lands on the last page: go there.
            const pages = await touched();
            onPage(pages);
          }}
        />
      )}
    </View>
  );
}

function PostCard({
  post,
  viewerIsAdmin,
  onChanged,
}: {
  post: ForumPost;
  viewerIsAdmin: boolean;
  onChanged: () => void;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.content);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [held, setHeld] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const role = post.author ? roleLabel(post.author.role) : null;
  const name = post.author?.name ?? "Compte supprimé";

  const save = async (): Promise<void> => {
    const problem = postDraftProblem(draft);
    if (problem !== null) {
      setError(problem);
      return;
    }
    setPending(true);
    setError(null);
    const reply = await editForumPostApi(post.id, draft.trim());
    setPending(false);
    if (!reply.ok) {
      setError(reply.error ?? "Modification impossible.");
      return;
    }
    setEditing(false);
    // Saved, and taken down with it: say so here, the card is about to
    // disappear from everyone else's thread.
    setHeld(reply.heldForReview === true);
    onChanged();
  };

  const remove = async (): Promise<void> => {
    setPending(true);
    setError(null);
    const reply = await hideForumPostApi(post.id);
    setPending(false);
    setConfirmRemove(false);
    if (!reply.ok) {
      setError(reply.error ?? "Suppression impossible.");
      return;
    }
    onChanged();
  };

  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Avatar avatarUrl={post.avatar} displayName={name} size={38} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
            <Text variant="h3">{name}</Text>
            {role !== null ? (
              <Text variant="micro" style={{ color: theme.accent, fontSize: 9 }}>
                {role}
              </Text>
            ) : null}
          </View>
          <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
            {post.author ? `niveau ${String(post.author.level)} · ` : ""}
            {forumDate(post.createdAt)}
            {post.editedAt !== null ? " · modifié" : ""}
          </Text>
        </View>
      </View>

      {post.hidden ? (
        <Text variant="micro" style={{ color: colors.danger }}>
          Retiré : toi seul le vois
        </Text>
      ) : null}

      {editing ? (
        <View style={{ gap: 8 }}>
          <MessageInput
            value={draft}
            onChangeText={(text) => {
              setDraft(text);
              setError(null);
            }}
            maxLength={BODY_MAX}
            accessibilityLabel="Modifier le message"
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <GradientButton
              label={pending ? "…" : "Enregistrer"}
              disabled={pending}
              onPress={() => void save()}
              style={{ flex: 1 }}
            />
            <ActionChip
              label="Annuler"
              tone="neutral"
              disabled={pending}
              onPress={() => {
                setEditing(false);
                setError(null);
              }}
            />
          </View>
        </View>
      ) : (
        <NoteMarkdown markdown={post.content} dimmed={post.hidden} />
      )}

      {!editing && (canEditPost(post) || canRemovePost(post, viewerIsAdmin)) ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          {canEditPost(post) ? (
            <ActionChip
              label="Modifier"
              tone="neutral"
              disabled={pending}
              onPress={() => {
                setDraft(post.content);
                setEditing(true);
                setHeld(false);
              }}
            />
          ) : null}
          {canRemovePost(post, viewerIsAdmin) ? (
            <ActionChip
              label="Retirer"
              tone="danger"
              disabled={pending}
              onPress={() => {
                setConfirmRemove(true);
              }}
            />
          ) : null}
        </View>
      ) : null}

      {error !== null ? (
        <Text variant="bodySm" accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
      {held ? <HeldNotice /> : null}

      <AppModal
        visible={confirmRemove}
        closeDisabled={pending}
        onClose={() => {
          setConfirmRemove(false);
        }}
      >
        <Text variant="h2">Retirer ce message ?</Text>
        <Text variant="body">
          {post.mine
            ? "Il disparaît du sujet pour les autres. Tu le verras encore, marqué comme retiré."
            : "Il disparaît du sujet pour tout le monde, sauf pour son auteur."}
        </Text>
        <GradientButton label="Retirer" loading={pending} onPress={() => void remove()} />
        <ActionChip
          label="Annuler"
          tone="neutral"
          disabled={pending}
          onPress={() => {
            setConfirmRemove(false);
          }}
        />
      </AppModal>
    </Card>
  );
}

function ReplyBox({
  topicId,
  onReplied,
}: {
  topicId: string;
  onReplied: () => Promise<void>;
}): React.JSX.Element {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [held, setHeld] = useState(false);

  const send = async (): Promise<void> => {
    const problem = postDraftProblem(content);
    if (problem !== null) {
      setError(problem);
      return;
    }
    setSending(true);
    setError(null);
    setHeld(false);
    const reply = await replyInForumApi(topicId, content.trim());
    setSending(false);
    if (!reply.ok) {
      setError(reply.error ?? "La réponse n'a pas pu être publiée. Réessaie.");
      return;
    }
    setContent("");
    setHeld(reply.heldForReview === true);
    await onReplied();
  };

  return (
    <View style={{ gap: 8 }}>
      <Text variant="micro">Répondre</Text>
      <MessageInput
        value={content}
        onChangeText={(text) => {
          setContent(text);
          setError(null);
        }}
        maxLength={BODY_MAX}
        placeholder="Ta réponse…"
        accessibilityLabel="Ta réponse"
      />
      <Text variant="bodySm">
        Markdown accepté. Les personnes qui ont écrit dans ce sujet seront prévenues.
      </Text>
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
      {held ? <HeldNotice /> : null}
      <GradientButton
        label={sending ? "Envoi…" : "Répondre"}
        disabled={sending}
        onPress={() => void send()}
      />
    </View>
  );
}
