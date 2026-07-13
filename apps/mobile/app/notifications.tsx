import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { Pulse, Rise } from "@/components/anim";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, SectionLabel, Text } from "@/components/ui";
import { markAllNotificationsRead, useNotifications, type NotificationItem } from "@/lib/queries";
import { useSession } from "@/lib/session";

const TYPE_META: Record<string, { icon: string; color: string }> = {
  BADGE_EARNED: { icon: "◆", color: colors.warning },
  LEVEL_UP: { icon: "▲", color: colors.accent },
  CERTIFICATE_ISSUED: { icon: "❖", color: colors.info },
  LEAGUE: { icon: "♟", color: colors.promote },
  REVIEW_DUE: { icon: "↻", color: colors.textSecondary },
};

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${String(m)} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${String(h)} h`;
  const d = Math.round(h / 24);
  if (d < 2) return "hier";
  return `il y a ${String(d)} j`;
}

export default function Notifications(): React.JSX.Element {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useNotifications(userId);

  const unread = (data ?? []).filter((n) => n.readAt === null).length;

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
        <Pressable onPress={() => router.back()}>
          <Text variant="micro">← Retour</Text>
        </Pressable>
        {unread > 0 ? (
          <Pressable onPress={() => void readAll()}>
            <Text variant="micro" style={{ color: colors.accent }}>
              Tout lire
            </Text>
          </Pressable>
        ) : null}
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
      ) : error ? (
        <ErrorState onRetry={() => void refetch()} code="NOTIF_LOAD" />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          title="Rien pour l'instant"
          body="Tes badges, montées de niveau et certificats apparaîtront ici."
        />
      ) : (
        <View style={{ gap: 10 }}>
          {(data ?? []).map((n: NotificationItem, i) => {
            const meta = TYPE_META[n.type] ?? { icon: "•", color: colors.textSecondary };
            const isUnread = n.readAt === null;
            return (
              <Rise key={n.id} index={Math.min(i, 8)}>
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
                      {timeAgo(n.createdAt)}
                    </Text>
                  </View>
                </Card>
              </Rise>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
