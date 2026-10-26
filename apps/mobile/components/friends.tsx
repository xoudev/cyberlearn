import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "@cyberlearn/tokens";
import { ActionChip } from "@/components/buttons";
import { Avatar } from "@/components/media";
import { Card, Divider, Text } from "@/components/ui";
import { acceptFriendApi, removeFriendApi, requestFriendByHandleApi } from "@/lib/api";
import { useCosmetics } from "@/lib/cosmetics";
import {
  profileTarget,
  removeLabel,
  unfriendAlert,
  type Friend,
  type FriendListKind,
} from "@/lib/friends";
import { levelLabel } from "@cyberlearn/lib/gamification/level-label";
import {
  CHALLENGE_LABEL,
  challengeFriendName,
  DUEL_OPEN_LABEL,
  REQUEST_SENT_LABEL,
  ROW_FRIEND_LABEL,
  rowFriendAction,
  rowFriendActionName,
  type FriendshipView,
} from "@cyberlearn/lib/social/friendship";
import {
  FRIEND_ACTIVITY_EMPTY,
  friendActivityText,
  isFriendsLatest,
  type FriendActivityItem,
} from "@cyberlearn/lib/social/friend-activity";
import { notificationAge } from "@cyberlearn/lib/social/notification-age";

/**
 * "Ami", beside a friend's name on a board: the site's mark
 * (apps/web/components/friend-mark.tsx), the same two heads, read as the word
 * by a screen reader. Only where showsFriendMark says so - never on an
 * anonymous row, where it would say who the row is.
 */
export function FriendMark({ size = 13 }: { size?: number }): React.JSX.Element {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Ami"
      style={{ marginLeft: 6, flexShrink: 0 }}
    >
      <Svg
        width={size}
        height={size}
        viewBox="0 0 20 20"
        fill="none"
        stroke={colors.accent}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Circle cx="7.5" cy="6.5" r="3" />
        <Path d="M2 16.5c0-3 2.5-4.6 5.5-4.6s5.5 1.6 5.5 4.6" />
        <Circle cx="14.5" cy="7.5" r="2.4" fill={colors.accent} />
        <Path d="M13 12.2c3 0 5 1.5 5 4.3" />
      </Svg>
    </View>
  );
}

/**
 * The least width a friend's avatar and name keep before the chips wrap under
 * them: the 42 px avatar, its gap and about eighty pixels of name.
 */
const FRIEND_IDENTITY_BASIS = 136;

/**
 * One person in a friends list, with what the site's panel offers on the
 * same row: accept or refuse a request, take one back, end a friendship, or
 * challenge a friend ("Défier" opens the duels screen with them picked, and
 * waits, greyed, while a duel between the two is still open).
 * The name opens their profile when it would open for the reader. Ending a
 * friendship asks first, as on the site: nobody is told, and undoing it takes
 * a new request the other person has to accept.
 */
export function FriendRow({
  friend,
  kind,
  onChanged,
}: {
  friend: Friend;
  kind: FriendListKind;
  onChanged: () => Promise<void>;
}): React.JSX.Element {
  const router = useRouter();
  const { theme } = useCosmetics();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = async (call: typeof removeFriendApi): Promise<void> => {
    setPending(true);
    setError(null);
    const reply = await call(friend.id);
    setPending(false);
    // A request withdrawn in the meantime is not worth an error: the list is
    // about to show the truth, as on the site.
    if (!reply.ok && reply.error !== "Cette demande n'est plus en attente.") {
      setError(reply.error ?? "Impossible pour l'instant.");
    }
    await onChanged();
  };

  const remove = (): void => {
    if (kind !== "friends") {
      void act(removeFriendApi);
      return;
    }
    const alert = unfriendAlert(friend.name, () => void act(removeFriendApi));
    Alert.alert(alert.title, alert.message, alert.buttons);
  };

  const username = friend.username;
  const target = profileTarget(friend);
  const openProfile =
    target !== null
      ? () => router.push({ pathname: "/u/[username]", params: { username: target } })
      : undefined;

  return (
    <View style={{ gap: 6 }}>
      {/* The chips go under the name when the name would be left with less than
          FRIEND_IDENTITY_BASIS (a 375 px screen, "Duel en cours" and "Retirer"),
          instead of squeezing it to a few letters. */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "flex-end",
          columnGap: 12,
          rowGap: 6,
        }}
      >
        <Pressable
          onPress={openProfile}
          disabled={openProfile === undefined}
          accessibilityRole={openProfile ? "link" : undefined}
          accessibilityLabel={openProfile ? `Profil de ${friend.name}` : friend.name}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: FRIEND_IDENTITY_BASIS,
            minHeight: 44,
          }}
        >
          <Avatar avatarUrl={friend.avatar} displayName={friend.name} size={42} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="h3" numberOfLines={1}>
              {friend.name}
            </Text>
            <Text variant="mono" style={{ fontSize: 10.5, color: theme.accent }}>
              {levelLabel(friend.level)}
              {username !== null ? (
                <Text style={{ color: colors.textMuted }}>{`  @${username}`}</Text>
              ) : null}
            </Text>
          </View>
        </Pressable>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {kind === "friends" ? (
            <ActionChip
              label={friend.duelOpen === true ? DUEL_OPEN_LABEL : CHALLENGE_LABEL}
              accessibilityLabel={challengeFriendName(friend.name, friend.duelOpen === true)}
              disabled={pending || friend.duelOpen === true}
              onPress={() => {
                router.push({ pathname: "/duels", params: { ami: friend.id } });
              }}
            />
          ) : null}
          {kind === "incoming" ? (
            <ActionChip
              label="Accepter"
              disabled={pending}
              onPress={() => void act(acceptFriendApi)}
            />
          ) : null}
          <ActionChip
            label={removeLabel(kind)}
            tone="neutral"
            disabled={pending}
            onPress={remove}
          />
        </View>
      </View>
      {error !== null ? (
        <Text variant="bodySm" accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * "Tes amis" on the home tab, as on the site's dashboard: a friend's moment a
 * line (who, what, when, in the same words, @cyberlearn/lib/social/
 * friend-activity), the name opening their profile, and "Défier" on each
 * friend's most recent line, greyed while a duel between the two is open.
 * Friends who have been quiet leave a sentence and a duel to send.
 */
export function FriendsActivityCard({ items }: { items: FriendActivityItem[] }): React.JSX.Element {
  const router = useRouter();
  const { theme } = useCosmetics();
  const now = Date.now();

  if (items.length === 0) {
    return (
      <Card style={{ gap: 10 }}>
        <Text variant="bodySm">{FRIEND_ACTIVITY_EMPTY}</Text>
        <View style={{ flexDirection: "row" }}>
          <ActionChip
            label="Défier un ami"
            onPress={() => {
              router.push("/duels");
            }}
          />
        </View>
      </Card>
    );
  }

  return (
    <Card style={{ gap: 10 }}>
      {items.map((item, i) => {
        const { friend } = item;
        const target = friend.profileOpen ? friend.username : null;
        return (
          <View key={item.key} style={{ gap: 10 }}>
            {i > 0 ? <Divider /> : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Pressable
                onPress={
                  target !== null
                    ? () => {
                        router.push({ pathname: "/u/[username]", params: { username: target } });
                      }
                    : undefined
                }
                disabled={target === null}
                accessibilityRole={target !== null ? "link" : undefined}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}
              >
                <Avatar avatarUrl={friend.avatarSrc} displayName={friend.name} size={36} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodySm" style={{ color: colors.textSecondary }}>
                    <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>
                      {friend.name}
                    </Text>
                    {` ${friendActivityText(item.kind, item.title)}`}
                  </Text>
                  <Text variant="mono" style={{ fontSize: 10.5, color: theme.accent }}>
                    {notificationAge(item.at, now)}
                  </Text>
                </View>
              </Pressable>
              {isFriendsLatest(items, i) ? (
                <ActionChip
                  label={friend.duelOpen ? DUEL_OPEN_LABEL : CHALLENGE_LABEL}
                  accessibilityLabel={challengeFriendName(friend.name, friend.duelOpen)}
                  disabled={friend.duelOpen}
                  onPress={() => {
                    router.push({ pathname: "/duels", params: { ami: friend.id } });
                  }}
                />
              ) : null}
            </View>
          </View>
        );
      })}
    </Card>
  );
}

/**
 * "Ajouter" on a public row of the leaderboard, as on the site: one chip that
 * asks, or agrees when they asked first, by the handle the row shows (its
 * rows carry no id; the server finds it only among the players it names).
 * Once sent it says so; once friends it becomes the mark. A refusal is said
 * in an alert, and the chip stays to try again.
 *
 * What it learned belongs to one person and one reading of the server, so it
 * is keyed by both: the board's rows are keyed by rank and kept across a new
 * period (keepPreviousData), and the chip would hand "Demande envoyée" or the
 * mark to whoever takes the rank next.
 */
export function AddFriendChip(props: AddFriendChipProps): React.JSX.Element | null {
  return <RowFriendChip key={`@${props.username}:${props.view}`} {...props} />;
}

interface AddFriendChipProps {
  username: string;
  name: string;
  view: FriendshipView;
}

function RowFriendChip({ username, name, view }: AddFriendChipProps): React.JSX.Element | null {
  const queryClient = useQueryClient();
  const [state, setState] = useState<FriendshipView>(view);
  const [pending, setPending] = useState(false);

  if (state === "friends") return <FriendMark />;
  if (state === "outgoing") {
    return (
      <Text variant="micro" style={{ color: colors.textMuted, fontSize: 9 }}>
        {REQUEST_SENT_LABEL}
      </Text>
    );
  }
  const action = rowFriendAction(state);
  if (action === null) return null;

  const send = async (): Promise<void> => {
    setPending(true);
    const reply = await requestFriendByHandleApi(username);
    setPending(false);
    if (!reply.ok) {
      Alert.alert("Demande impossible", reply.error ?? "Impossible pour l'instant.");
      return;
    }
    setState(reply.becameFriends === true ? "friends" : "outgoing");
    await queryClient.invalidateQueries({ queryKey: ["friends"] });
  };

  return (
    <ActionChip
      label={ROW_FRIEND_LABEL[action]}
      accessibilityLabel={rowFriendActionName(action, name)}
      disabled={pending}
      onPress={() => void send()}
    />
  );
}
