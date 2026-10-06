import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import {
  countdownLabel,
  placeLabel,
  TEAM_SCOPE_LABELS,
  TOURNAMENT_PHASE_LABELS,
} from "@cyberlearn/lib/challenges/tournament";
import { categoryMeta, difficultyMeta } from "@cyberlearn/lib/content/vocabulary";
import { BackButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, Pill, Text } from "@/components/ui";
import { fetchTournamentApi } from "@/lib/api";
import {
  challengeStateLine,
  myStandingLine,
  PHASE_COLOR,
  TOURNAMENT_REFRESH_MS,
  type TournamentView,
} from "@/lib/tournaments";

/** While a tournament has yet to start, how often to look whether it has. */
const UPCOMING_REFRESH_MS = 30_000;

/**
 * One tournament, as on the site: its challenges once started, the teams and
 * the players in order. Read again every few seconds while it runs, so a flag
 * found in another classroom shows here without pulling to refresh.
 */
export default function TournamentScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["tournament", id],
    enabled: Boolean(id),
    queryFn: () => fetchTournamentApi(id ?? ""),
    refetchInterval: (query) => {
      const phase = query.state.data?.phase;
      return phase === "RUNNING"
        ? TOURNAMENT_REFRESH_MS
        : phase === "UPCOMING"
          ? UPCOMING_REFRESH_MS
          : false;
    },
  });

  return (
    <Screen onRefresh={() => refetch()}>
      <View style={{ marginBottom: 16 }}>
        <BackButton label="Tournois" />
      </View>
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : error !== null ? (
        <ErrorState onRetry={() => void refetch()} code="TOURNAMENT_LOAD" />
      ) : data === null || data === undefined ? (
        <EmptyState
          title="Tournoi introuvable"
          body="Ce tournoi n'existe pas, ou aucune de tes classes n'y participe."
        />
      ) : (
        <TournamentBody view={data} />
      )}
    </Screen>
  );
}

function TournamentBody({ view }: { view: TournamentView }): React.JSX.Element {
  const router = useRouter();
  const target =
    view.phase === "UPCOMING" ? view.startsAt : view.phase === "RUNNING" ? view.endsAt : null;
  // Counted from the server's clock as it was when the view was read.
  const remaining =
    target === null ? null : countdownLabel(Date.parse(target) - Date.parse(view.serverNow));

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Pill label={TOURNAMENT_PHASE_LABELS[view.phase]} color={PHASE_COLOR[view.phase]} />
          <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
            {TEAM_SCOPE_LABELS[view.teamScope]}
          </Text>
        </View>
        <Text variant="display" style={{ fontSize: 26 }}>
          {view.title}
        </Text>
        {view.description !== "" ? <Text variant="body">{view.description}</Text> : null}
        <Text variant="bodySm">{`Du ${view.startsLabel} au ${view.endsLabel}`}</Text>
        {remaining !== null ? (
          <Text variant="mono" style={{ color: PHASE_COLOR[view.phase] }}>
            {`${view.phase === "UPCOMING" ? "Début dans" : "Fin dans"} ${remaining}`}
          </Text>
        ) : null}
      </View>

      <Card accent={view.myTeam !== null ? colors.accent : undefined} style={{ gap: 4 }}>
        {view.role === "teacher" ? (
          <Text variant="bodySm">
            Tu suis ce tournoi comme professeur : tes élèves jouent, tu vois les scores.
          </Text>
        ) : view.role === "admin" ? (
          <Text variant="bodySm">
            Tu vois ce tournoi comme administrateur : il se compose dans la console.
          </Text>
        ) : view.myTeam === null ? (
          <Text variant="bodySm">Ta classe ne joue plus : les scores restent lisibles.</Text>
        ) : (
          <>
            <Text variant="bodySm" style={{ color: colors.textPrimary }}>
              {`Tu joues pour ${view.myTeam}.`}
            </Text>
            {view.me !== null ? (
              <Text variant="mono" style={{ fontSize: 12, color: colors.accent }}>
                {myStandingLine(view.me)}
              </Text>
            ) : null}
          </>
        )}
      </Card>

      <Text variant="h2">Défis</Text>
      {view.phase === "UPCOMING" ? (
        <Text variant="bodySm">
          {view.challengeCount > 1
            ? `Les ${String(view.challengeCount)} défis s'ouvrent au début du tournoi.`
            : "Le défi s'ouvre au début du tournoi."}
        </Text>
      ) : (
        view.challenges.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            onPress={() => {
              router.push({
                pathname: "/tournaments/challenge",
                params: { id: view.id, slug: c.slug },
              });
            }}
          >
            <Card
              accent={c.solvedByMe ? colors.accent : c.solvedByMyTeam ? colors.info : undefined}
              style={{ gap: 4 }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Text variant="h3" style={{ flex: 1 }}>
                  {c.title}
                </Text>
                <Text variant="mono" style={{ color: colors.accent }}>
                  {`${String(c.points)} pts`}
                </Text>
              </View>
              <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
                {`${categoryMeta(c.category).label} · ${difficultyMeta(c.difficulty).label} · ${challengeStateLine(c)}${c.firstTeam !== null ? ` · premier : ${c.firstTeam}` : ""}`}
              </Text>
            </Card>
          </Pressable>
        ))
      )}

      <Text variant="h2">
        {view.teamScope === "CLASS" ? "Classement des classes" : "Classement des écoles"}
      </Text>
      {view.teams.map((team) => (
        <Card
          key={team.name + team.detail}
          accent={team.isMine ? colors.accent : undefined}
          style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
        >
          <Text variant="mono" style={{ width: 36, color: colors.textMuted }}>
            {placeLabel(team.rank)}
          </Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="bodySm" style={{ color: colors.textPrimary }}>
              {team.name}
            </Text>
            <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
              {team.detail}
            </Text>
          </View>
          <Text variant="mono">{`${String(team.points)} pts`}</Text>
        </Card>
      ))}

      {view.phase !== "UPCOMING" ? (
        <>
          <Text variant="h2">Joueurs</Text>
          {view.players.length === 0 ? (
            <Text variant="bodySm">Personne n&apos;a encore trouvé de flag.</Text>
          ) : (
            view.players.map((player) => (
              <View
                key={`${String(player.rank)}-${player.name}-${player.team}`}
                style={{ flexDirection: "row", gap: 12, paddingVertical: 4 }}
              >
                <Text variant="mono" style={{ width: 36, color: colors.textMuted }}>
                  {placeLabel(player.rank)}
                </Text>
                <Text
                  variant="bodySm"
                  style={{
                    flex: 1,
                    color: player.isMe ? colors.accent : colors.textPrimary,
                  }}
                >
                  {`${player.isMe ? "Toi" : player.name} · ${player.team}`}
                </Text>
                <Text variant="mono">{`${String(player.points)} pts`}</Text>
              </View>
            ))
          )}
          <Text variant="bodySm" style={{ color: colors.textMuted }}>
            Un joueur apparaît sous son nom s&apos;il l&apos;a choisi pour le classement, anonyme
            sinon, et pas du tout s&apos;il s&apos;en est masqué ; ses flags comptent pour son
            équipe dans tous les cas.
          </Text>
        </>
      ) : null}
    </View>
  );
}
