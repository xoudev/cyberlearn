import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import { View, type ViewStyle } from "react-native";
import { colors } from "@cyberlearn/tokens";
import {
  byUrgency,
  counted,
  durationLabel,
  elapsedShare,
  phaseTallyWord,
  TEAM_SCOPE_LABELS,
  type TournamentPhase,
} from "@cyberlearn/lib/challenges/tournament";
import { PressableScale } from "@/components/anim";
import { BackButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import {
  Figure,
  NumberedFacts,
  PhasePill,
  SectionCount,
  WindowBar,
} from "@/components/tournament-parts";
import { Card, SectionLabel, StatCell, Text } from "@/components/ui";
import { fetchTournamentsApi } from "@/lib/api";
import { PHASE_COLOR, TOURNAMENT_ACCENT, type TournamentSummary } from "@/lib/tournaments";

/** How a tournament is scored, in three steps, in the site's words. */
const STEPS: { title: string; text: string }[] = [
  {
    title: "Un flag, des points",
    text: "Un défi rapporte ses points à ton équipe la première fois qu'un de ses membres en trouve le flag.",
  },
  {
    title: "Ton score à toi",
    text: "Il compte les flags que tu as trouvés toi-même, que ton équipe les ait déjà ou non.",
  },
  {
    title: "Un tableau en direct",
    text: "Les scores bougent pendant la partie. À points égaux, l'équipe arrivée la première passe devant.",
  },
];

const PHASES: readonly TournamentPhase[] = ["RUNNING", "UPCOMING", "FINISHED"];

/** A figure a third of the live panel's row wide. */
const THIRD: ViewStyle = { flexBasis: 0, flexGrow: 1 };

/** How long a tournament stays open: "2 h", "3 jours". */
function lengthOf(t: TournamentSummary): string {
  return durationLabel(Date.parse(t.endsAt) - Date.parse(t.startsAt));
}

/**
 * Tournaments: the site's /tournaments in the app. The CTF tournaments the
 * reader's classes take part in, counted by phase: the one running first,
 * with how much of its window has gone by, then the steps that explain the
 * scoring, then the ones to come and the ones played; each opens on its own
 * screen.
 */
export default function TournamentsScreen(): React.JSX.Element {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["tournaments"],
    queryFn: fetchTournamentsApi,
  });
  const sorted = data === undefined ? [] : [...data.tournaments].sort(byUrgency);

  return (
    <Screen onRefresh={() => refetch()}>
      <View style={{ marginBottom: 16 }}>
        <BackButton />
      </View>
      <View style={{ gap: 8, marginBottom: 20 }}>
        <Text variant="micro" style={{ color: TOURNAMENT_ACCENT }}>
          {"// CTF en équipe"}
        </Text>
        <Text variant="display" style={{ fontSize: 28 }}>
          Tournois
        </Text>
        <Text variant="body">
          Des défis CTF ouverts le temps d&apos;un tournoi, entre classes ou entre écoles. Tu joues
          pour ton équipe : ta classe, ou ton école.
        </Text>
      </View>
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : error !== null || data === undefined ? (
        <ErrorState onRetry={() => void refetch()} code="TOURNAMENTS_LOAD" />
      ) : (
        <TournamentsBody tournaments={sorted} readAt={Date.parse(data.serverNow)} />
      )}
    </Screen>
  );
}

/**
 * The list once read, already in order. `readAt` is the server's clock when
 * it was read, the moment the window bars of the running tournaments are
 * measured at, as on the site and on a tournament's screen.
 */
function TournamentsBody({
  tournaments,
  readAt,
}: {
  tournaments: readonly TournamentSummary[];
  readAt: number;
}): React.JSX.Element {
  const router = useRouter();
  const open = (id: string): void => {
    router.push({ pathname: "/tournaments/[id]", params: { id } });
  };
  const of = (phase: TournamentPhase): TournamentSummary[] =>
    tournaments.filter((t) => t.phase === phase);
  const running = of("RUNNING");
  const upcoming = of("UPCOMING");
  const finished = of("FINISHED");

  return (
    <View style={{ gap: 18 }}>
      {tournaments.length > 0 ? (
        <View style={{ flexDirection: "row", gap: 8 }} accessibilityLabel="Les tournois">
          {PHASES.map((phase) => {
            const n = of(phase).length;
            return (
              <StatCell
                key={phase}
                value={n}
                label={phaseTallyWord(phase, n)}
                accent={n > 0 ? PHASE_COLOR[phase] : colors.textMuted}
              />
            );
          })}
        </View>
      ) : null}

      {running.map((t) => (
        <LivePanel
          key={t.id}
          t={t}
          nowMs={readAt}
          onOpen={() => {
            open(t.id);
          }}
        />
      ))}

      <Card style={{ gap: 12 }}>
        <NumberedFacts facts={STEPS} />
      </Card>

      {tournaments.length === 0 ? (
        <EmptyState
          title="Aucun tournoi pour l'instant"
          body="Un tournoi réunit des classes : quand la tienne en rejoint un, il apparaît ici, et une notification te le dit."
        />
      ) : null}

      {upcoming.length > 0 ? (
        <View>
          <SectionLabel
            title="À venir"
            right={<SectionCount text={counted(upcoming.length, "tournoi")} />}
          />
          <View style={{ gap: 10 }}>
            {upcoming.map((t) => (
              <TournamentCard
                key={t.id}
                t={t}
                onOpen={() => {
                  open(t.id);
                }}
              />
            ))}
          </View>
        </View>
      ) : null}

      {finished.length > 0 ? (
        <View>
          <SectionLabel
            title="Terminés"
            right={<SectionCount text={counted(finished.length, "tournoi")} />}
          />
          <View style={{ gap: 10 }}>
            {finished.map((t) => (
              <TournamentCard
                key={t.id}
                t={t}
                onOpen={() => {
                  open(t.id);
                }}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/**
 * A tournament under way, before everything else: what it is, how much of its
 * window has gone by, its classes, challenges and length, and the way in.
 */
function LivePanel({
  t,
  nowMs,
  onOpen,
}: {
  t: TournamentSummary;
  nowMs: number;
  onOpen: () => void;
}): React.JSX.Element {
  const share = elapsedShare(t, nowMs);
  return (
    <Card accent={PHASE_COLOR.RUNNING} style={{ gap: 12, borderColor: `${PHASE_COLOR.RUNNING}55` }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <PhasePill phase={t.phase} />
        <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
          {TEAM_SCOPE_LABELS[t.teamScope]}
        </Text>
      </View>
      <Text variant="display" style={{ fontSize: 24 }}>
        {t.title}
      </Text>
      <Text variant="bodySm" style={{ color: colors.textSecondary }}>
        {`Du ${t.startsLabel} au ${t.endsLabel}`}
      </Text>
      <WindowBar
        share={share}
        phase={t.phase}
        caption={`${String(Math.floor(share * 100))} % du temps écoulé`}
      />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Figure label="Classes" value={String(t.classCount)} big style={THIRD} />
        <Figure label="Défis" value={String(t.challengeCount)} big style={THIRD} />
        <Figure label="Durée" value={lengthOf(t)} big style={THIRD} />
      </View>
      <PressableScale
        accessibilityLabel={`Entrer dans le tournoi ${t.title}`}
        onPress={onOpen}
        style={{
          minHeight: 48,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 12,
          backgroundColor: TOURNAMENT_ACCENT,
        }}
      >
        <Text variant="micro" style={{ color: colors.textPrimary, letterSpacing: 1.2 }}>
          Entrer dans le tournoi →
        </Text>
      </PressableScale>
    </Card>
  );
}

/**
 * A tournament to come or already played: its phase, its title, when it opens
 * or closed, its format, classes, challenges and length, and what opening it
 * shows.
 */
function TournamentCard({
  t,
  onOpen,
}: {
  t: TournamentSummary;
  onOpen: () => void;
}): React.JSX.Element {
  const upcoming = t.phase === "UPCOMING";
  const action = upcoming ? "Voir le tournoi" : "Voir les scores";
  const when = upcoming ? `Début : ${t.startsLabel}` : `Terminé le ${t.endsLabel}`;
  return (
    <PressableScale accessibilityLabel={`${t.title}, ${when}. ${action}`} onPress={onOpen}>
      <Card accent={PHASE_COLOR[t.phase]} style={{ gap: 8 }}>
        <View style={{ flexDirection: "row" }}>
          <PhasePill phase={t.phase} />
        </View>
        <Text variant="h3">{t.title}</Text>
        <Text variant="bodySm" style={{ color: colors.textSecondary }}>
          {when}
        </Text>
        <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
          {[
            TEAM_SCOPE_LABELS[t.teamScope],
            counted(t.classCount, "classe"),
            counted(t.challengeCount, "défi"),
            `${lengthOf(t)} de jeu`,
          ].join(" · ")}
        </Text>
        <Text variant="micro" style={{ color: TOURNAMENT_ACCENT, letterSpacing: 1 }}>
          {`${action} →`}
        </Text>
      </Card>
    </PressableScale>
  );
}
