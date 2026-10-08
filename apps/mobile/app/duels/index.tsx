import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import {
  duelActionLabel,
  duelRecord,
  isSettled,
  OUTCOME_LABEL,
  outcomeOf,
  wasPlayed,
} from "@cyberlearn/lib/social/duel";
import { PressableScale } from "@/components/anim";
import { ActionChip, BackButton, GradientButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, Pill, SectionLabel, StatCell, Text } from "@/components/ui";
import { createDuelApi, fetchDuelsApi, respondToDuelApi } from "@/lib/api";
import { useCosmetics } from "@/lib/cosmetics";
import {
  duelMeta,
  invitationMeta,
  outcomeTone,
  type DuelBoard,
  type DuelSummary,
} from "@/lib/duels";

/** The rules in three facts, in the site's words. */
const RULES: { title: string; text: string }[] = [
  {
    title: "Cinq questions, les mêmes pour vous deux",
    text: "Tirées au hasard des quiz des leçons du parcours choisi.",
  },
  {
    title: "Un jour pour accepter, un jour pour jouer",
    text: "Passé ce délai, un défi sans réponse expire, et un duel se règle sur les réponses données.",
  },
  {
    title: "À égalité, le premier à finir gagne",
    text: "Le plus de bonnes réponses l'emporte. Une réponse donnée est définitive.",
  },
];

/**
 * Duels: the site's /duels in the app. The reader's record, the rules, the
 * invitations waiting, a form to challenge a friend on a path (the friend
 * named in ?ami= picked), and every duel going on or settled, each with its
 * outcome in a word and its small print; a duel opens on its own screen.
 */
export default function DuelsScreen(): React.JSX.Element {
  const { ami } = useLocalSearchParams<{ ami?: string }>();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["duels"],
    queryFn: fetchDuelsApi,
  });
  const friendCount = data?.friends.length ?? 0;

  return (
    <Screen onRefresh={() => refetch()}>
      <View style={{ marginBottom: 16 }}>
        <BackButton />
      </View>
      <SectionLabel
        eyebrow={
          friendCount > 0
            ? `${String(friendCount)} ami${friendCount > 1 ? "s" : ""} à défier`
            : "entre amis"
        }
        title="Duels."
      />
      <Text variant="bodySm" style={{ marginBottom: 14 }}>
        Défie un ami sur un parcours : chacun répond de son côté aux mêmes questions, et voit le
        score de l&apos;autre avancer en direct.
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
  const { theme } = useCosmetics();
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
      {board.duels.length > 0 ? <RecordStats duels={board.duels} /> : null}

      <Rules />

      {invitations.length > 0 ? (
        <View>
          <SectionLabel
            title="On te défie"
            right={
              <SectionCount
                text={`${String(invitations.length)} invitation${invitations.length > 1 ? "s" : ""}`}
              />
            }
          />
          <View style={{ gap: 10 }}>
            {invitations.map((duel) => (
              <Card key={duel.id} accent={theme.accent} style={{ gap: 8 }}>
                <Text variant="micro" style={{ color: theme.accent }}>
                  Défi reçu
                </Text>
                <Text variant="bodySm" style={{ color: colors.textPrimary }}>
                  {`${duel.other.name} te défie sur « ${duel.pathTitle} »`}
                </Text>
                <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
                  {invitationMeta(duel)}
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
          </View>
        </View>
      ) : null}

      <View>
        <SectionLabel title="Lancer un duel" />
        {board.friends.length === 0 ? (
          <EmptyState
            title="Pas encore d'ami à défier"
            body="Un duel se joue entre amis : ajoute quelqu'un depuis son profil, ou accepte une demande dans tes amis, puis reviens ici."
            actionLabel="Voir mes amis"
            onAction={() => {
              router.push("/friends");
            }}
          />
        ) : (
          <Card style={{ gap: 10 }}>
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
          </Card>
        )}
        {message !== null ? (
          <Text variant="bodySm" style={{ color: colors.danger, marginTop: 10 }}>
            {message}
          </Text>
        ) : null}
      </View>

      {/* With no friend and no duel, the section above already says what to do. */}
      {board.friends.length > 0 || others.length > 0 ? (
        <View>
          <SectionLabel
            title="Tes duels"
            right={
              others.length > 0 ? (
                <SectionCount
                  text={`${String(others.length)} duel${others.length > 1 ? "s" : ""}`}
                />
              ) : undefined
            }
          />
          {others.length === 0 ? (
            <EmptyState
              title="Aucun duel pour l'instant"
              body="Choisis un ami et un parcours ci-dessus : ton duel s'affichera ici."
            />
          ) : (
            <View style={{ gap: 10 }}>
              {others.map((duel) => (
                <DuelCard
                  key={duel.id}
                  duel={duel}
                  onOpen={() => {
                    open(duel.id);
                  }}
                />
              ))}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

/**
 * The reader's record: wins, losses and draws side by side, the duels going
 * on and the invitations waiting under them when there are some. A draw's
 * number stays in the text colour, as on the site.
 */
function RecordStats({ duels }: { duels: DuelSummary[] }): React.JSX.Element {
  const { theme } = useCosmetics();
  const record = duelRecord(duels);
  const results = record.filter((line) => isSettled(line.outcome));
  const open = record.filter((line) => !isSettled(line.outcome));
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {results.map((line) => (
          <StatCell
            key={line.outcome}
            value={line.n}
            label={line.word}
            accent={
              line.outcome === "draw" ? colors.textPrimary : outcomeTone(line.outcome, theme.accent)
            }
          />
        ))}
      </View>
      {open.length > 0 ? (
        <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
          {open.map((line) => `${String(line.n)} ${line.word}`).join(" · ")}
        </Text>
      ) : null}
    </View>
  );
}

/** The rules in three facts, numbered as the site's page numbers them. */
function Rules(): React.JSX.Element {
  const { theme } = useCosmetics();
  return (
    <Card style={{ gap: 12 }}>
      {RULES.map((rule, i) => (
        <View key={rule.title} style={{ flexDirection: "row", gap: 12 }}>
          <Text
            style={{ fontFamily: `${fonts.mono}_500Medium`, fontSize: 12, color: theme.accent }}
          >
            {String(i + 1).padStart(2, "0")}
          </Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="h3">{rule.title}</Text>
            <Text variant="bodySm">{rule.text}</Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

/** A section's count, on the right of its title. */
function SectionCount({ text }: { text: string }): React.JSX.Element {
  return (
    <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
      {text}
    </Text>
  );
}

/**
 * One of the reader's duels: the path and its outcome in a word, both
 * players face to face with their right answers, the small print, and what
 * opening it does.
 */
function DuelCard({ duel, onOpen }: { duel: DuelSummary; onOpen: () => void }): React.JSX.Element {
  const { theme } = useCosmetics();
  const outcome = outcomeOf(duel);
  const tone = outcomeTone(outcome, theme.accent);
  const played = wasPlayed(outcome);
  const action = duelActionLabel(duel);
  const score = played
    ? `${String(duel.readerScore.correct)} à ${String(duel.otherScore.correct)}`
    : "pas de score";
  return (
    <PressableScale
      onPress={onOpen}
      accessibilityLabel={`${duel.pathTitle}, contre ${duel.other.name} : ${OUTCOME_LABEL[outcome]}, ${score}. ${action}`}
    >
      <Card accent={tone} style={{ gap: 10 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <Text variant="micro" numberOfLines={1} style={{ flex: 1, color: colors.textMuted }}>
            {duel.pathTitle}
          </Text>
          <Pill label={OUTCOME_LABEL[outcome]} color={tone} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text variant="h3" style={{ flex: 1 }}>
            Toi
          </Text>
          <Text
            style={{
              fontFamily: `${fonts.mono}_500Medium`,
              fontSize: 20,
              color: played ? colors.textPrimary : colors.textMuted,
            }}
          >
            {played
              ? `${String(duel.readerScore.correct)} – ${String(duel.otherScore.correct)}`
              : "–"}
          </Text>
          <Text variant="h3" numberOfLines={1} style={{ flex: 1, textAlign: "right" }}>
            {duel.other.name}
          </Text>
        </View>
        <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
          {duelMeta(duel)}
        </Text>
        <Text
          variant="micro"
          style={{
            color: outcome === "live" ? theme.accent : colors.textSecondary,
            letterSpacing: 1,
          }}
        >
          {`${action} →`}
        </Text>
      </Card>
    </PressableScale>
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
