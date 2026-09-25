import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { ActionChip } from "@/components/buttons";
import { Avatar } from "@/components/media";
import { Text } from "@/components/ui";
import { acceptFriendApi, removeFriendApi } from "@/lib/api";
import { useCosmetics } from "@/lib/cosmetics";
import { removeLabel, type Friend, type FriendListKind } from "@/lib/friends";

/**
 * One person in a friends list, with what the site's panel offers on the
 * same row: accept or refuse a request, take one back, or end a friendship.
 * The name opens their profile when they have a handle to point at.
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

  const username = friend.username;
  const openProfile =
    username !== null
      ? () => router.push({ pathname: "/u/[username]", params: { username } })
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
              {`NIV·${String(friend.level)}`}
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
            onPress={() => void act(removeFriendApi)}
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
