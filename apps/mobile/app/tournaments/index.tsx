import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import {
  TEAM_SCOPE_LABELS,
  TOURNAMENT_PHASE_LABELS,
  type TournamentPhase,
} from "@cyberlearn/lib/challenges/tournament";
import { BackButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, Pill, SectionLabel, Text } from "@/components/ui";
import { fetchTournamentsApi } from "@/lib/api";
import { PHASE_COLOR, type TournamentSummary } from "@/lib/tournaments";

const PHASE_ORDER: Record<TournamentPhase, number> = { RUNNING: 0, UPCOMING: 1, FINISHED: 2 };

/** Running first, ending soonest; then the next to open; then the last to have closed. */
function byUrgency(a: TournamentSummary, b: TournamentSummary): number {
  if (a.phase !== b.phase) return PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase];
  if (a.phase === "RUNNING") return a.endsAt.localeCompare(b.endsAt);
  if (a.phase === "UPCOMING") return a.startsAt.localeCompare(b.startsAt);
  return b.endsAt.localeCompare(a.endsAt);
}

/**
 * Tournaments: the site's /tournaments in the app. The CTF tournaments the
 * reader's classes take part in; each opens on its own screen.
 */
export default function TournamentsScreen(): React.JSX.Element {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["tournaments"],
    queryFn: fetchTournamentsApi,
  });

  return (
    <Screen onRefresh={() => refetch()}>
      <View style={{ marginBottom: 16 }}>
        <BackButton />
      </View>
      <SectionLabel eyebrow="entre classes" title="Tournois." />
      <Text variant="bodySm" style={{ marginBottom: 14 }}>
        Des défis CTF ouverts le temps d&apos;un tournoi, entre classes ou entre écoles. Un défi
        rapporte ses points à ton équipe la première fois qu&apos;un de ses membres en trouve le
        flag ; ton score compte les flags que tu as trouvés.
      </Text>
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : error !== null || data === undefined ? (
        <ErrorState onRetry={() => void refetch()} code="TOURNAMENTS_LOAD" />
      ) : data.length === 0 ? (
        <EmptyState
          title="Aucun tournoi"
          body="Un tournoi réunit des classes : quand la tienne en rejoint un, il apparaît ici."
        />
      ) : (
        <View style={{ gap: 10 }}>
          {[...data].sort(byUrgency).map((t) => (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              onPress={() => {
                router.push({ pathname: "/tournaments/[id]", params: { id: t.id } });
              }}
            >
              <Card style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <Pill label={TOURNAMENT_PHASE_LABELS[t.phase]} color={PHASE_COLOR[t.phase]} />
                  <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
                    {TEAM_SCOPE_LABELS[t.teamScope]}
                  </Text>
                </View>
                <Text variant="h3">{t.title}</Text>
                <Text variant="bodySm">{`Du ${t.startsLabel} au ${t.endsLabel}`}</Text>
                <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
                  {`${String(t.classCount)} classe${t.classCount > 1 ? "s" : ""} · ${String(t.challengeCount)} défi${t.challengeCount > 1 ? "s" : ""}`}
                </Text>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
