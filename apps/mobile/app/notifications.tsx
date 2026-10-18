import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import {
  friendRequestSender,
  REQUEST_ANSWERED_LABEL,
  REQUEST_GONE_LABEL,
} from "@cyberlearn/lib/social/friendship";
import { notificationAge } from "@cyberlearn/lib/social/notification-age";
import { colors } from "@cyberlearn/tokens";
import { PressableScale, Pulse, Rise } from "@/components/anim";
import { ActionChip, BackButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, SectionLabel, Text } from "@/components/ui";
import {
  markAllNotificationsRead,
  markNotificationRead,
  useNotificationHistory,
  type NotificationItem,
} from "@/lib/queries";
import { acceptFriendApi, declineFriendApi, fetchFriendsApi } from "@/lib/api";
import { answerableSender } from "@/lib/friends";
import { inAppRouteFor } from "@/lib/notification-links";
import { notificationMeta } from "@/lib/notification-meta";
import { flattenNotificationPages } from "@/lib/notification-pages";
import { useSession } from "@/lib/session";

const TYPE_META: Record<string, { icon: string; color: string }> = {
  BADGE_EARNED: { icon: "◆", color: colors.warning },
  LEVEL_UP: { icon: "▲", color: colors.accent },
  CERTIFICATE_ISSUED: { icon: "❖", color: colors.info },
  LEAGUE: { icon: "♟", color: colors.promote },
  REVIEW_DUE: { icon: "↻", color: colors.textSecondary },
  FORUM_REPLY: { icon: "❝", color: colors.info },
  DUEL_INVITE: { icon: "⚔", color: colors.accent },
  DUEL_RESULT: { icon: "⚑", color: colors.warning },
  TOURNAMENT_ANNOUNCED: { icon: "🏆", color: colors.accent },
};

/**
 * "Accepter" and "Refuser" under a friend request's notice, beside the card
 * rather than inside it, as on the site. Refusing removes only a request
 * still waiting (declineFriendApi), never a friendship accepted elsewhere
 * since the notice arrived. Once answered, the screen says how in their
 * place (AnsweredNote): the answer takes the request off the friends list
 * these buttons are read from, and they would vanish with what they said.
 */
function FriendRequestAnswer({
  senderId,
  onAnswered,
}: {
  senderId: string;
  onAnswered: (said: string) => Promise<void>;
}): React.JSX.Element {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answer = async (accept: boolean): Promise<void> => {
    setPending(true);
    setError(null);
    const reply = accept ? await acceptFriendApi(senderId) : await declineFriendApi(senderId);
    setPending(false);
    if (reply.ok) {
      await onAnswered(REQUEST_ANSWERED_LABEL[accept ? "accepted" : "declined"]);
    } else if (reply.error === undefined || reply.error === REQUEST_GONE_LABEL) {
      // Answered elsewhere, or taken back: nothing is left to answer.
      await onAnswered(REQUEST_GONE_LABEL);
    } else {
      setError(reply.error);
    }
  };

  return (
    <View style={{ gap: 6, paddingLeft: 44 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <ActionChip label="Accepter" disabled={pending} onPress={() => void answer(true)} />
        <ActionChip
          label="Refuser"
          tone="neutral"
          disabled={pending}
          onPress={() => void answer(false)}
        />
      </View>
      {error !== null ? (
        <Text variant="bodySm" accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** How a request was answered from its notice, said where its buttons were. */
function AnsweredNote({ said }: { said: string }): React.JSX.Element {
  return (
    <Text
      variant="bodySm"
      accessibilityLiveRegion="polite"
      style={{ color: colors.textMuted, paddingLeft: 44 }}
    >
      {said}
    </Text>
  );
}

export default function Notifications(): React.JSX.Element {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useNotificationHistory(userId);
  // Every page loaded so far, fifty at a time; "Charger plus" adds the next.
  const items = data === undefined ? undefined : flattenNotificationPages(data.pages);

  const unread = (items ?? []).filter((n) => n.readAt === null).length;

  // Whose request still waits on the reader: the friends screen's incoming
  // list, read only when a friend request is on the screen.
  const hasRequests = (items ?? []).some((n) => friendRequestSender(n) !== null);
  const { data: friends } = useQuery({
    queryKey: ["friends"],
    queryFn: fetchFriendsApi,
    enabled: hasRequests,
  });
  const waiting = new Set((friends?.incoming ?? []).map((person) => person.id));
  // What each request answered here said, by notification: kept on the
  // screen once the answer has taken the request off the list above.
  const [answers, setAnswers] = useState<Readonly<Record<string, string>>>({});

  async function answered(notificationId: string, wasUnread: boolean, said: string): Promise<void> {
    setAnswers((prev) => ({ ...prev, [notificationId]: said }));
    if (wasUnread) await markNotificationRead(notificationId);
    await queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    await queryClient.invalidateQueries({ queryKey: ["notifications-unread", userId] });
    // The friends screen, its count and the friends board read the same rows.
    await queryClient.invalidateQueries({ queryKey: ["friends"] });
    await queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
  }

  async function readAll(): Promise<void> {
    if (!userId) return;
    await markAllNotificationsRead(userId);
    await queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    await queryClient.invalidateQueries({ queryKey: ["notifications-unread", userId] });
  }

  return (
    <Screen>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <BackButton />
        {unread > 0 ? <ActionChip label="Tout marquer lu" onPress={() => void readAll()} /> : null}
      </View>

      <SectionLabel
        eyebrow="Inbox"
        title="Notifications"
        right={
          unread > 0 ? (
            <Text variant="micro" style={{ color: colors.accent }}>
              {unread} non lue{unread > 1 ? "s" : ""}
            </Text>
          ) : undefined
        }
      />

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : error && items === undefined ? (
        // A failed refresh keeps the list it already has; only a first load
        // that failed says so, instead of passing for an empty inbox.
        <ErrorState onRetry={() => void refetch()} code="NOTIF_LOAD" />
      ) : (items ?? []).length === 0 ? (
        <EmptyState
          title="Rien pour l'instant"
          body="Tes badges, montées de niveau et certificats apparaîtront ici."
        />
      ) : (
        <View style={{ gap: 10 }}>
          {(items ?? []).map((n: NotificationItem, i) => {
            const meta = notificationMeta(n.type);
            const isUnread = n.readAt === null;
            const route = inAppRouteFor(n.actionUrl);
            const sender = answerableSender(n, waiting);
            const said = answers[n.id];
            return (
              <Rise
                key={n.id}
                index={Math.min(i, 8)}
                // Steady for a request's notice, buttons drawn or not yet:
                // the card under it is not drawn anew when they arrive.
                {...(friendRequestSender(n) !== null ? { style: { gap: 8 } } : {})}
              >
                <PressableScale
                  disabled={!isUnread && route === null}
                  accessibilityLabel={
                    route !== null ? `Ouvrir « ${n.title} »` : `Marquer « ${n.title} » comme lue`
                  }
                  onPress={() => {
                    if (isUnread) {
                      void markNotificationRead(n.id).then(async () => {
                        await queryClient.invalidateQueries({
                          queryKey: ["notifications", userId],
                        });
                        await queryClient.invalidateQueries({
                          queryKey: ["notifications-unread", userId],
                        });
                      });
                    }
                    if (route !== null) router.push(route);
                  }}
                >
                  <Card
                    accent={isUnread ? colors.accent : undefined}
                    style={{ flexDirection: "row", gap: 12, opacity: isUnread ? 1 : 0.75 }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: meta.color,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: `${meta.color}14`,
                      }}
                    >
                      <Text style={{ color: meta.color, fontSize: 13 }}>{meta.icon}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text variant="h3" numberOfLines={1} style={{ flex: 1 }}>
                          {n.title}
                        </Text>
                        {isUnread ? (
                          <Pulse>
                            <View
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: 4,
                                backgroundColor: colors.accent,
                              }}
                            />
                          </Pulse>
                        ) : null}
                      </View>
                      <Text variant="bodySm" numberOfLines={2}>
                        {n.body}
                      </Text>
                      <Text variant="micro" style={{ color: colors.textDisabled, marginTop: 2 }}>
                        {notificationAge(n.createdAt, Date.now())}
                        {isUnread ? " · toucher pour marquer lu" : ""}
                      </Text>
                    </View>
                  </Card>
                </PressableScale>
                {said !== undefined ? (
                  <AnsweredNote said={said} />
                ) : sender !== null ? (
                  <FriendRequestAnswer
                    senderId={sender}
                    onAnswered={(text) => answered(n.id, isUnread, text)}
                  />
                ) : null}
              </Rise>
            );
          })}
          {hasNextPage ? (
            <View style={{ alignItems: "center", marginTop: 6 }}>
              <ActionChip
                label={isFetchingNextPage ? "Chargement…" : "Charger plus"}
                tone="neutral"
                disabled={isFetchingNextPage}
                onPress={() => void fetchNextPage()}
              />
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}
