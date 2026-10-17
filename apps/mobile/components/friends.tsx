import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "@cyberlearn/tokens";
import { ActionChip } from "@/components/buttons";
import { Avatar } from "@/components/media";
import { Text } from "@/components/ui";
import { acceptFriendApi, removeFriendApi } from "@/lib/api";
import { useCosmetics } from "@/lib/cosmetics";
import {
  profileTarget,
  removeLabel,
  unfriendAlert,
  type Friend,
  type FriendListKind,
} from "@/lib/friends";
import { levelLabel } from "@cyberlearn/lib/gamification/level-label";

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
 * One person in a friends list, with what the site's panel offers on the
 * same row: accept or refuse a request, take one back, or end a friendship.
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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable
          onPress={openProfile}
          disabled={openProfile === undefined}
          accessibilityRole={openProfile ? "link" : undefined}
          accessibilityLabel={openProfile ? `Profil de ${friend.name}` : friend.name}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, minHeight: 44 }}
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
