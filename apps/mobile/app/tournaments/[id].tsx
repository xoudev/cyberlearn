import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import {
  challengeState,
  challengeStateLabel,
  challengeTypeLabel,
  countdownLabel,
  counted,
  elapsedShare,
  standingFigures,
  TEAM_SCOPE_LABELS,
  teamFoundLabel,
  teamsLabel,
  tournamentWinners,
} from "@cyberlearn/lib/challenges/tournament";
import { categoryMeta, difficultyMeta } from "@cyberlearn/lib/content/vocabulary";
import { PressableScale } from "@/components/anim";
import { BackButton } from "@/components/buttons";
import { CheckIcon, LockIcon } from "@/components/icons";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import {
  Figure,
  LiveTag,
  PhasePill,
  Pips,
  PlacePlate,
  SectionCount,
  WindowBar,
} from "@/components/tournament-parts";
import { Card, Divider, SectionLabel, Text } from "@/components/ui";
import { fetchTournamentApi } from "@/lib/api";
import { useCosmetics } from "@/lib/cosmetics";
import {
  challengeStateColor,
  COUNTDOWN_LOW_MS,
  PHASE_COLOR,
  TOURNAMENT_ACCENT,
  TOURNAMENT_REFRESH_MS,
  type TournamentChallengeRow,
  type TournamentPlayerRow,
  type TournamentTeamRow,
  type TournamentView,
} from "@/lib/tournaments";

/** While a tournament has yet to start, how often to look whether it has. */
const UPCOMING_REFRESH_MS = 30_000;

/** The shape of a challenge sealed until the start: lines, not their content. */
const REDACTED: readonly `${number}%`[] = ["88%", "56%"];

/**
 * One tournament, as on the site: when it opens or closes, ticking every
 * second on the server's clock; how much of its window has gone by; the
 * winner once it is over; where the reader stands; its challenges once
 * started (sealed and counted before); the teams and the players in order.
 * Read again every few seconds while it runs, so a flag found in another
 * classroom shows here without pulling to refresh, and once more when the
 * start or the end comes.
 */
export default function TournamentScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
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
        <TournamentBody view={data} receivedAt={dataUpdatedAt} onReload={refetch} />
      )}
    </Screen>
  );
}

/**
 * The server's clock, ticking every second while `ticking`: the time the view
 * was read on the server, moved on by what this phone has counted since it
 * received it.
 */
function useServerNow(serverNow: string, receivedAt: number, ticking: boolean): number {
  const skew = Date.parse(serverNow) - receivedAt;
  const [now, setNow] = useState(() => Date.now() + skew);
  useEffect(() => {
    setNow(Date.now() + skew);
    if (!ticking) return;
    const id = setInterval(() => {
      setNow(Date.now() + skew);
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [skew, ticking]);
  return now;
}

/** What the briefing's clock needs: the view, when it came, and how to read it again. */
interface ClockProps {
  view: TournamentView;
  /** When this phone received the view, which the server's clock is counted from. */
  receivedAt: number;
  onReload: () => Promise<unknown>;
}

/** The tournament once read, in its sections. Only the briefing's clock ticks. */
function TournamentBody({ view, receivedAt, onReload }: ClockProps): React.JSX.Element {
  const router = useRouter();
  const open = (slug: string): void => {
    router.push({ pathname: "/tournaments/challenge", params: { id: view.id, slug } });
  };

  return (
    <View style={{ gap: 20 }}>
      <Hero view={view} />
      <Briefing view={view} receivedAt={receivedAt} onReload={onReload} />
      <Challenges view={view} onOpen={open} />
      <Teams view={view} />
      {view.phase !== "UPCOMING" ? (
        <Players players={view.players} over={view.phase === "FINISHED"} />
      ) : null}
    </View>
  );
}

/** What the tournament is: its phase and format, its title, its dates, who plays, how many challenges. */
function Hero({ view }: { view: TournamentView }): React.JSX.Element {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <PhasePill phase={view.phase} />
        <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
          {`Tournoi · ${TEAM_SCOPE_LABELS[view.teamScope]}`}
        </Text>
      </View>
      <Text variant="display" style={{ fontSize: 26 }}>
        {view.title}
      </Text>
      {view.description !== "" ? <Text variant="body">{view.description}</Text> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
        <Figure label="Début" value={view.startsLabel} />
        <Figure label="Fin" value={view.endsLabel} />
        <Figure
          label="Équipes"
          value={teamsLabel(view.teamScope, view.teams.length, view.classCount)}
        />
        <Figure label="Défis" value={String(view.challengeCount)} />
      </View>
    </View>
  );
}

/** The briefing: its clock, or the winner once it is over; where the reader stands. */
function Briefing({ view, receivedAt, onReload }: ClockProps): React.JSX.Element {
  return (
    <Card accent={TOURNAMENT_ACCENT} style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
        <Text variant="micro" style={{ color: TOURNAMENT_ACCENT }}>
          Tournoi · briefing
        </Text>
        <Text variant="micro">{counted(view.teams.length, "équipe")}</Text>
      </View>
      <BriefingClock view={view} receivedAt={receivedAt} onReload={onReload} />
      <Divider />
      <Standing view={view} />
    </Card>
  );
}

/**
 * The time left, big, ticking every second on the server's clock, or the
 * winner once it is over; how much of the window has gone by. When the start
 * or the end comes, the tournament is read once more, which opens its
 * challenges or closes its scores.
 */
function BriefingClock({ view, receivedAt, onReload }: ClockProps): React.JSX.Element {
  const target =
    view.phase === "UPCOMING"
      ? Date.parse(view.startsAt)
      : view.phase === "RUNNING"
        ? Date.parse(view.endsAt)
        : null;
  const now = useServerNow(view.serverNow, receivedAt, target !== null);

  const reloadedFor = useRef<number | null>(null);
  useEffect(() => {
    if (target === null || now < target || reloadedFor.current === target) return;
    reloadedFor.current = target;
    void onReload();
  }, [now, target, onReload]);

  const remainingMs = target === null ? null : target - now;
  const share = elapsedShare(view, now);
  const low = view.phase === "RUNNING" && remainingMs !== null && remainingMs <= COUNTDOWN_LOW_MS;
  const caption =
    view.phase === "RUNNING"
      ? `${String(Math.floor(share * 100))} % du temps écoulé`
      : view.phase === "UPCOMING"
        ? "Pas encore commencé"
        : "Les scores sont définitifs";
  const clockLabel = view.phase === "UPCOMING" ? "Début dans" : "Fin dans";
  return (
    <>
      {remainingMs !== null ? (
        <View
          accessibilityRole="timer"
          accessibilityLabel={`${clockLabel} ${countdownLabel(remainingMs)}`}
          style={{ gap: 6 }}
        >
          <Text variant="micro">{clockLabel}</Text>
          <Text
            style={{
              fontFamily: `${fonts.mono}_700Bold`,
              fontSize: 34,
              color: low ? colors.warning : PHASE_COLOR[view.phase],
              fontVariant: ["tabular-nums"],
            }}
          >
            {countdownLabel(remainingMs)}
          </Text>
        </View>
      ) : (
        <Result teams={view.teams} />
      )}
      <WindowBar share={share} phase={view.phase} caption={caption} />
    </>
  );
}

/** Once it is over: the team at the top of the board, or the teams tied there. */
function Result({ teams }: { teams: readonly TournamentTeamRow[] }): React.JSX.Element {
  const winners = tournamentWinners(teams);
  const [top] = winners;
  if (top === undefined) {
    return (
      <View style={{ gap: 6 }}>
        <Text variant="micro">Résultat</Text>
        <Text variant="h2">Personne n&apos;a trouvé de flag.</Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      <Text variant="micro">{winners.length > 1 ? "Vainqueurs" : "Vainqueur"}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <PlacePlate rank={1} scored />
        <Text variant="display" style={{ flex: 1, fontSize: 22 }}>
          {winners.map((team) => team.name).join(", ")}
        </Text>
      </View>
      <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
        {`${counted(top.points, "point")} · ${counted(top.solved, "défi")}`}
      </Text>
    </View>
  );
}

/**
 * Where the reader stands: their team and its place, their own place, points
 * and flags, or why they only watch. Before the start nobody has a flag, so
 * only the team they will play for is said.
 */
function Standing({ view }: { view: TournamentView }): React.JSX.Element {
  if (view.role === "teacher" || view.role === "admin") {
    return (
      <Text variant="bodySm">
        {view.role === "teacher"
          ? "Tu suis ce tournoi comme professeur : tes élèves jouent, tu vois les scores."
          : "Tu vois ce tournoi comme administrateur : il se compose dans la console."}
      </Text>
    );
  }
  if (view.myTeam === null) {
    return <Text variant="bodySm">Ta classe ne joue plus : les scores restent lisibles.</Text>;
  }
  const lead =
    view.phase === "UPCOMING"
      ? "Tu joueras pour"
      : view.phase === "FINISHED"
        ? "Tu as joué pour"
        : "Tu joues pour";
  const figures = view.phase === "UPCOMING" ? null : standingFigures(view);
  return (
    <View style={{ gap: 14 }} accessibilityLabel="Ta place">
      <Text variant="bodySm" style={{ color: colors.textSecondary }}>
        {`${lead} `}
        <Text style={{ fontFamily: `${fonts.sans}_700Bold`, color: colors.textPrimary }}>
          {view.myTeam}
        </Text>
      </Text>
      {figures !== null ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
          {figures.map((figure) => (
            <Figure
              key={figure.key}
              label={figure.label}
              value={figure.value ?? "–"}
              unit={figure.unit}
              note={figure.note}
              big
              color={figure.value === null ? colors.textMuted : colors.textPrimary}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** The challenges once it has started, the reader's team's count above; before, one sealed card each. */
function Challenges({
  view,
  onOpen,
}: {
  view: TournamentView;
  onOpen: (slug: string) => void;
}): React.JSX.Element {
  if (view.phase === "UPCOMING") {
    return (
      <View>
        <SectionLabel
          title="Défis"
          right={<SectionCount text={counted(view.challengeCount, "défi")} />}
        />
        <View style={{ gap: 10 }}>
          <Text variant="bodySm">
            {view.challengeCount > 1
              ? `Les ${String(view.challengeCount)} défis s'ouvrent au début du tournoi.`
              : "Le défi s'ouvre au début du tournoi."}
          </Text>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
          >
            {Array.from({ length: view.challengeCount }, (_, i) => (
              <LockedCard key={i} n={i + 1} />
            ))}
          </View>
        </View>
      </View>
    );
  }
  const total = view.challenges.length;
  const found = view.challenges.filter((c) => c.solvedByMyTeam).length;
  return (
    <View>
      <SectionLabel
        title="Défis"
        right={
          <SectionCount
            text={view.myTeam !== null ? teamFoundLabel(found, total) : counted(total, "défi")}
          />
        }
      />
      <View style={{ gap: 10 }}>
        {view.challenges.map((c) => (
          <ChallengeCard
            key={c.id}
            c={c}
            myTeam={view.myTeam}
            over={view.phase === "FINISHED"}
            onOpen={() => {
              onOpen(c.slug);
            }}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * One challenge, the whole card a way in: its domain and type, its title and
 * difficulty, its points in big, where it stands for the reader (found by
 * them, by their team, by others, by nobody), and the team that found it first.
 */
function ChallengeCard({
  c,
  myTeam,
  over,
  onOpen,
}: {
  c: TournamentChallengeRow;
  myTeam: string | null;
  /** The tournament is over: a challenge nobody found is no longer a call to play. */
  over: boolean;
  onOpen: () => void;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const state = challengeState(c);
  const tone = challengeStateColor(state, over);
  const found = state === "mine" || state === "team";
  const label = challengeStateLabel(c, over);
  const category = categoryMeta(c.category);
  const diff = difficultyMeta(c.difficulty);
  return (
    <PressableScale
      accessibilityLabel={`${c.title}, ${String(c.points)} points, ${label}`}
      onPress={onOpen}
    >
      <Card
        accent={found ? tone : undefined}
        style={{ padding: 0, borderColor: found ? `${tone}66` : colors.borderDefault }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 10,
            paddingVertical: 9,
            paddingHorizontal: 14,
            backgroundColor: colors.bgBase,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderSubtle,
          }}
        >
          <Text variant="micro" style={{ color: category.color }}>
            {category.short}
          </Text>
          <Text variant="micro">{challengeTypeLabel(c.type)}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 12, padding: 14 }}>
          <View style={{ flex: 1, gap: 8 }}>
            <Text variant="h3" style={{ fontSize: 16 }}>
              {c.title}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Pips level={diff.level} color={diff.color} />
              <Text variant="micro" style={{ color: colors.textSecondary }}>
                {diff.label}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontFamily: `${fonts.sans}_800ExtraBold`,
                fontSize: 26,
                color: colors.textPrimary,
              }}
            >
              {String(c.points)}
            </Text>
            <Text variant="micro">pts</Text>
          </View>
        </View>
        <View
          style={{
            gap: 6,
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderTopWidth: 1,
            borderTopColor: colors.borderSubtle,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {found ? <CheckIcon size={12} color={tone} strokeWidth={2} /> : null}
            <Text
              variant="micro"
              style={{ color: state === "found" ? colors.textSecondary : tone }}
            >
              {label}
            </Text>
          </View>
          {c.firstTeam !== null ? (
            <View
              style={{ flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 6 }}
            >
              <Text variant="micro">Premier :</Text>
              <Text
                variant="bodySm"
                style={{
                  color:
                    myTeam !== null && c.firstTeam === myTeam ? theme.accent : colors.textSecondary,
                }}
              >
                {c.firstTeam}
              </Text>
            </View>
          ) : null}
        </View>
      </Card>
    </PressableScale>
  );
}

/** A challenge before the start: there, numbered, its content withheld. */
function LockedCard({ n }: { n: number }): React.JSX.Element {
  return (
    <View
      style={{
        flexBasis: "45%",
        flexGrow: 1,
        gap: 10,
        padding: 12,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: colors.borderDefault,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          columnGap: 8,
          rowGap: 4,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <LockIcon size={12} color={colors.textMuted} />
          <Text variant="micro">Verrouillé</Text>
        </View>
        <Text variant="micro">{`Défi ${String(n).padStart(2, "0")}`}</Text>
      </View>
      <View style={{ gap: 6 }}>
        {REDACTED.map((width) => (
          <View
            key={width}
            style={{ height: 8, width, backgroundColor: `${colors.textMuted}55` }}
          />
        ))}
      </View>
      <Text variant="micro" style={{ color: colors.textMuted, letterSpacing: 0.8 }}>
        S&apos;ouvre au début
      </Text>
    </View>
  );
}

/**
 * The teams in order, each with its place (none while nobody has scored), its
 * points and flags, and a bar of them against the leader's; the reader's own
 * team said so.
 */
function Teams({ view }: { view: TournamentView }): React.JSX.Element {
  const scored = view.teams.some((team) => team.points > 0);
  const leader = Math.max(0, ...view.teams.map((team) => team.points));
  return (
    <View>
      <SectionLabel
        title={view.teamScope === "CLASS" ? "Classement des classes" : "Classement des écoles"}
        right={view.phase === "RUNNING" ? <LiveTag /> : undefined}
      />
      <View style={{ gap: 10 }}>
        {view.teams.map((team) => (
          <TeamRow
            key={team.name + team.detail}
            team={team}
            ranked={scored}
            share={leader > 0 ? team.points / leader : 0}
          />
        ))}
      </View>
    </View>
  );
}

/** One team of the ranking: its place, its name and what it is made of, its points and flags, its bar. */
function TeamRow({
  team,
  ranked,
  share,
}: {
  team: TournamentTeamRow;
  /** Some team has scored: the places mean something. */
  ranked: boolean;
  /** Its points against the leader's, from 0 to 1. */
  share: number;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  return (
    <Card accent={team.isMine ? theme.accent : undefined} style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <PlacePlate rank={team.rank} scored={team.points > 0} ranked={ranked} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <Text variant="h3">{team.name}</Text>
            {team.isMine ? (
              <Text variant="micro" style={{ color: theme.accent }}>
                Ton équipe
              </Text>
            ) : null}
          </View>
          <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
            {team.detail}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          <Text variant="mono" style={{ color: colors.textPrimary }}>
            {`${String(team.points)} pts`}
          </Text>
          <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
            {counted(team.solved, "défi")}
          </Text>
        </View>
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ height: 3, backgroundColor: colors.borderSubtle }}
      >
        <View
          style={{
            height: "100%",
            width: `${Math.round(share * 1000) / 10}%`,
            backgroundColor: team.isMine ? theme.accent : colors.textMuted,
          }}
        />
      </View>
    </Card>
  );
}

/** The first players by their own points, the reader marked; who is named, and why. */
function Players({
  players,
  over,
}: {
  players: readonly TournamentPlayerRow[];
  /** The tournament is over: nobody will find a flag any more. */
  over: boolean;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  return (
    <View>
      <SectionLabel title="Joueurs" />
      <View style={{ gap: 10 }}>
        {players.length === 0 ? (
          <Text variant="bodySm">
            {over ? "Personne n'a trouvé de flag." : "Personne n'a encore trouvé de flag."}
          </Text>
        ) : (
          <Card style={{ gap: 12 }}>
            {players.map((player) => (
              <View
                key={`${String(player.rank)}-${player.name}-${player.team}`}
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <PlacePlate rank={player.rank} scored />
                <View style={{ flex: 1, gap: 2 }}>
                  <View
                    style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}
                  >
                    <Text
                      variant="bodySm"
                      style={{ color: player.isMe ? theme.accent : colors.textPrimary }}
                    >
                      {player.name}
                    </Text>
                    {player.isMe ? (
                      <Text variant="micro" style={{ color: theme.accent }}>
                        Toi
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
                    {player.team}
                  </Text>
                </View>
                <Text variant="mono" style={{ color: colors.textPrimary }}>
                  {`${String(player.points)} pts`}
                </Text>
              </View>
            ))}
          </Card>
        )}
        <Text variant="bodySm" style={{ color: colors.textMuted }}>
          Un joueur apparaît sous son nom s&apos;il l&apos;a choisi pour le classement, anonyme
          sinon, et pas du tout s&apos;il s&apos;en est masqué ; ses flags comptent pour son équipe
          dans tous les cas.
        </Text>
      </View>
    </View>
  );
}
