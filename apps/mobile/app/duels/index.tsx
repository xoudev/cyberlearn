import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { DUEL_STATUS_LABELS } from "@cyberlearn/lib/social/duel";
import { ActionChip, BackButton, GradientButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, SectionLabel, Text } from "@/components/ui";
import { createDuelApi, fetchDuelsApi, respondToDuelApi } from "@/lib/api";
import { duelResultLine, type DuelBoard } from "@/lib/duels";

/**
 * Duels: the site's /duels in the app. The invitations waiting, a form to
 * challenge a friend on a path, and the duels going on or settled; a duel
 * opens on its own screen.
 */
export default function DuelsScreen(): React.JSX.Element {
  const { ami } = useLocalSearchParams<{ ami?: string }>();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["duels"],
    queryFn: fetchDuelsApi,
  });

  return (
    <Screen onRefresh={() => refetch()}>
      <View style={{ marginBottom: 16 }}>
        <BackButton />
      </View>
      <SectionLabel eyebrow="entre amis" title="Duels." />
      <Text variant="bodySm" style={{ marginBottom: 14 }}>
        Cinq questions tirées d&apos;un parcours, les mêmes pour vous deux. Chacun répond de son
        côté et voit le score de l&apos;autre avancer ; le plus de bonnes réponses gagne, à égalité
        celui qui a fini le premier.
      </Text>
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : error !== null || data === undefined ? (
        <ErrorState onRetry={() => void refetch()} code="DUELS_LOAD" />
      ) : (
        <DuelsBody board={data} initialFriend={ami ?? null} />
      )}
    </Screen>
  );
}

function DuelsBody({
  board,
  initialFriend,
}: {
  board: DuelBoard;
  initialFriend: string | null;
}): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [friend, setFriend] = useState<string | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setFriend(
      board.friends.some((f) => f.id === initialFriend)
        ? initialFriend
        : (board.friends[0]?.id ?? null),
    );
    setPath(board.paths[0]?.id ?? null);
  }, [board, initialFriend]);

  const invitations = board.duels.filter((d) => d.status === "PENDING" && !d.readerIsChallenger);
  const others = board.duels.filter((d) => !invitations.includes(d));
  const open = (id: string): void => {
    router.push({ pathname: "/duels/[id]", params: { id } });
  };

  const send = async (): Promise<void> => {
    if (friend === null || path === null) return;
    setBusy(true);
    setMessage(null);
    const reply = await createDuelApi(friend, path);
    setBusy(false);
    if (!reply.ok) {
      setMessage(reply.error);
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["duels"] });
    open(reply.id);
  };

  const respond = async (id: string, accept: boolean): Promise<void> => {
    const reply = await respondToDuelApi(id, accept);
    void queryClient.invalidateQueries({ queryKey: ["duels"] });
    if (reply.ok && accept) open(id);
    else if (!reply.ok) setMessage(reply.error);
  };

  return (
    <View style={{ gap: 16 }}>
      {invitations.map((duel) => (
        <Card key={duel.id} accent={colors.accent} style={{ gap: 8 }}>
          <Text variant="bodySm" style={{ color: colors.textPrimary }}>
            {`${duel.other.name} te défie sur « ${duel.pathTitle} ».`}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <ActionChip label="Accepter" onPress={() => void respond(duel.id, true)} />
            <ActionChip
              label="Refuser"
              tone="neutral"
              onPress={() => void respond(duel.id, false)}
            />
          </View>
        </Card>
      ))}

      <Card style={{ gap: 10 }}>
        <Text variant="micro" style={{ color: colors.textMuted }}>
          LANCER UN DUEL
        </Text>
        {board.friends.length === 0 ? (
          <Text variant="bodySm">
            Un duel se joue entre amis : ajoute quelqu&apos;un depuis son profil, puis reviens ici.
          </Text>
        ) : (
          <>
            <Text variant="bodySm">Ami</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {board.friends.map((f) => (
                <Choice
                  key={f.id}
                  label={f.name}
                  picked={friend === f.id}
                  onPress={() => {
                    setFriend(f.id);
                  }}
                />
              ))}
            </View>
            <Text variant="bodySm">Parcours</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {board.paths.map((p) => (
                <Choice
                  key={p.id}
                  label={p.title}
                  picked={path === p.id}
                  onPress={() => {
                    setPath(p.id);
                  }}
                />
              ))}
            </View>
            <GradientButton
              label="Lancer le défi"
              loading={busy}
              disabled={friend === null || path === null}
              onPress={() => void send()}
            />
          </>
        )}
        {message !== null ? (
          <Text variant="bodySm" style={{ color: colors.danger }}>
            {message}
          </Text>
        ) : null}
      </Card>

      {others.length === 0 ? (
        <EmptyState title="Aucun duel" body="Défie un ami : le duel apparaîtra ici." />
      ) : (
        others.map((duel) => (
          <Pressable
            key={duel.id}
            onPress={() => {
              open(duel.id);
            }}
            accessibilityRole="button"
          >
            <Card style={{ gap: 4 }}>
              <Text variant="bodySm" style={{ color: colors.textPrimary }}>
                {`${duel.readerIsChallenger ? "Contre" : "Défi de"} ${duel.other.name} · ${duel.pathTitle}`}
              </Text>
              <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
                {duelResultLine(duel) ?? DUEL_STATUS_LABELS[duel.status]}
              </Text>
            </Card>
          </Pressable>
        ))
      )}
    </View>
  );
}

function Choice({
  label,
  picked,
  onPress,
}: {
  label: string;
  picked: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: picked }}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: picked ? colors.accent : colors.borderDefault,
      }}
    >
      <Text variant="bodySm" style={{ color: picked ? colors.accent : colors.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}
