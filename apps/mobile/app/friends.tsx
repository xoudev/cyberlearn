import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { ActionChip, BackButton } from "@/components/buttons";
import { MessageInput } from "@/components/forum";
import { FriendRow } from "@/components/friends";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, Divider, SectionLabel, Text } from "@/components/ui";
import { fetchFriendsApi } from "@/lib/api";
import { handleFrom, listCountLabel, type Friend, type FriendListKind } from "@/lib/friends";

const SECTIONS: { kind: FriendListKind; title: string }[] = [
  { kind: "incoming", title: "Demandes reçues" },
  { kind: "friends", title: "Tes amis" },
  { kind: "outgoing", title: "Demandes envoyées" },
];

/**
 * Friends: the site's panel next to the bell, as a screen. Requests waiting
 * on the reader first, because those are the ones somebody is waiting on;
 * then friends; then the requests the reader sent. A friendship starts on
 * somebody's profile, as on the site, so the screen also opens one by handle.
 */
export default function Friends(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["friends"],
    queryFn: fetchFriendsApi,
  });

  const reload = async (): Promise<void> => {
    await refetch();
    // The friends board and the hub's count read the same friendships.
    await queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
  };

  const empty =
    data !== undefined &&
    data.incoming.length === 0 &&
    data.friends.length === 0 &&
    data.outgoing.length === 0;

  return (
    <Screen onRefresh={() => refetch()}>
      <View style={{ marginBottom: 16 }}>
        <BackButton />
      </View>
      <SectionLabel eyebrow="Social" title="Amis" />

      <FindSomebody />

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : error || !data ? (
        <ErrorState onRetry={() => void refetch()} code="FRIENDS_LOAD" />
      ) : empty ? (
        <EmptyState
          title="Aucun ami pour l'instant"
          body="Une amitié commence sur le profil de quelqu'un : ouvre un nom dans le classement, ou cherche son pseudo ci-dessus."
        />
      ) : (
        <View style={{ gap: 18, marginTop: 18 }}>
          {SECTIONS.map(({ kind, title }) =>
            data[kind].length > 0 ? (
              <FriendSection
                key={kind}
                kind={kind}
                title={title}
                people={data[kind]}
                onChanged={reload}
              />
            ) : null,
          )}
        </View>
      )}
    </Screen>
  );
}

function FriendSection({
  kind,
  title,
  people,
  onChanged,
}: {
  kind: FriendListKind;
  title: string;
  people: Friend[];
  onChanged: () => Promise<void>;
}): React.JSX.Element {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text variant="h3">{title}</Text>
        <Text variant="micro" style={{ color: colors.textMuted }}>
          {listCountLabel(kind, people.length)}
        </Text>
      </View>
      <Card style={{ gap: 10 }}>
        {people.map((friend, i) => (
          <View key={friend.id} style={{ gap: 10 }}>
            {i > 0 ? <Divider /> : null}
            <FriendRow friend={friend} kind={kind} onChanged={onChanged} />
          </View>
        ))}
      </Card>
    </View>
  );
}

/** Opens somebody's profile by handle: the only way to find a person here. */
function FindSomebody(): React.JSX.Element {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const open = (): void => {
    const handle = handleFrom(value);
    if (handle === null) {
      setError("Un pseudo compte de 3 à 32 caractères : lettres, chiffres et tirets.");
      return;
    }
    setError(null);
    router.push({ pathname: "/u/[username]", params: { username: handle } });
  };

  return (
    <Card style={{ gap: 8 }}>
      <Text variant="micro" style={{ color: colors.textMuted }}>
        Ouvrir un profil
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <MessageInput
          value={value}
          onChangeText={(text) => {
            setValue(text);
            setError(null);
          }}
          multiline={false}
          minHeight={46}
          maxLength={40}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={open}
          placeholder="@pseudo"
          accessibilityLabel="Pseudo à ouvrir"
          style={{ flex: 1 }}
        />
        <ActionChip label="Ouvrir" onPress={open} />
      </View>
      {error !== null ? (
        <Text variant="bodySm" accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
    </Card>
  );
}
