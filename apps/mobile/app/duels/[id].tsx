import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { DUEL_STATUS_LABELS } from "@cyberlearn/lib/social/duel";
import { ActionChip, BackButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, Text } from "@/components/ui";
import { answerDuelApi, fetchDuelApi, respondToDuelApi } from "@/lib/api";
import { DUEL_REFRESH_MS, nextQuestion, type DuelView } from "@/lib/duels";

/**
 * One duel, played in the app as on the site: both scores, the next
 * question, the right option shown after a miss, the result once both are
 * done. Read again every few seconds while it is going on, so the other
 * player's score moves as they answer.
 */
export default function DuelScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["duel", id],
    enabled: Boolean(id),
    queryFn: () => fetchDuelApi(id ?? ""),
    refetchInterval: (query) => {
      const duel = query.state.data;
      return duel?.status === "ACTIVE" || (duel?.status === "PENDING" && duel.readerIsChallenger)
        ? DUEL_REFRESH_MS
        : false;
    },
  });

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackButton label="Duels" />
      </View>
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : error !== null ? (
        <ErrorState onRetry={() => void refetch()} code="DUEL_LOAD" />
      ) : data === null || data === undefined ? (
        <EmptyState title="Duel introuvable" body="Ce duel n'existe pas, ou ne te concerne pas." />
      ) : (
        <DuelBody view={data} />
      )}
    </Screen>
  );
}

function DuelBody({ view }: { view: DuelView }): React.JSX.Element {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const next = nextQuestion(view);

  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["duel", view.id] });
    void queryClient.invalidateQueries({ queryKey: ["duels"] });
  };

  const answer = async (index: number, selected: number): Promise<void> => {
    const question = view.questions.find((q) => q.index === index);
    setBusy(true);
    setMessage(null);
    const reply = await answerDuelApi(view.id, index, selected);
    setBusy(false);
    if (!reply.ok) {
      setMessage(reply.error);
      return;
    }
    setFeedback(
      reply.correct
        ? "Bonne réponse."
        : `Raté. La bonne réponse : ${question?.options[reply.correctIndex] ?? ""}.`,
    );
    refresh();
  };

  const respond = async (accept: boolean): Promise<void> => {
    const reply = await respondToDuelApi(view.id, accept);
    if (!reply.ok) setMessage(reply.error);
    refresh();
  };

  return (
    <View style={{ gap: 14 }}>
      <Card style={{ gap: 10 }}>
        <Text variant="micro" style={{ color: colors.accent }}>
          {`// DUEL · ${view.pathTitle} · ${DUEL_STATUS_LABELS[view.status]}`}
        </Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Score name="Toi" score={view.readerScore} count={view.questionCount} accent />
          <Score name={view.other.name} score={view.otherScore} count={view.questionCount} />
        </View>
      </Card>

      {view.status === "PENDING" ? (
        view.readerIsChallenger ? (
          <Text variant="bodySm">
            {`En attente de ${view.other.name} : le duel commence quand il ou elle l'accepte, dans la journée.`}
          </Text>
        ) : (
          <Card style={{ gap: 8 }}>
            <Text variant="bodySm" style={{ color: colors.textPrimary }}>
              {`${view.other.name} te défie sur « ${view.pathTitle} » : cinq questions, le meilleur score gagne.`}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <ActionChip label="Accepter" onPress={() => void respond(true)} />
              <ActionChip label="Refuser" tone="neutral" onPress={() => void respond(false)} />
            </View>
          </Card>
        )
      ) : null}

      {view.status === "DECLINED" || view.status === "EXPIRED" ? (
        <Text variant="bodySm">
          {view.status === "DECLINED"
            ? "Ce duel a été refusé."
            : "Ce duel n'a pas été joué à temps."}
        </Text>
      ) : null}

      {feedback !== null && view.status !== "PENDING" ? (
        <Text
          variant="bodySm"
          style={{ color: feedback.startsWith("Bonne") ? colors.success : colors.danger }}
        >
          {feedback}
        </Text>
      ) : null}

      {view.status === "ACTIVE" && next !== null ? (
        <Card style={{ gap: 8 }}>
          <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
            {`Question ${String(next.index + 1)} / ${String(view.questionCount)} · ${next.domain}`}
          </Text>
          <Text variant="h3">{next.question}</Text>
          {next.options.map((option, k) => (
            <Pressable
              key={k}
              disabled={busy}
              onPress={() => void answer(next.index, k)}
              accessibilityRole="button"
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: colors.borderDefault,
                opacity: busy ? 0.6 : 1,
              }}
            >
              <Text variant="bodySm" style={{ color: colors.textPrimary }}>
                {option}
              </Text>
            </Pressable>
          ))}
        </Card>
      ) : null}

      {view.status === "ACTIVE" && next === null ? (
        <Text variant="bodySm">
          {`Tu as tout répondu. En attente de ${view.other.name} : le résultat tombe quand il ou elle a fini, ou à la fin de la journée.`}
        </Text>
      ) : null}

      {view.status === "FINISHED" ? (
        <Card style={{ gap: 4 }}>
          <Text variant="display" style={{ fontSize: 24 }}>
            {view.winner === "draw"
              ? "Égalité."
              : view.winner === "reader"
                ? "Victoire !"
                : "Défaite."}
          </Text>
          <Text variant="bodySm">
            {`${String(view.readerScore.correct)} à ${String(view.otherScore.correct)} contre ${view.other.name}.`}
          </Text>
        </Card>
      ) : null}

      {message !== null ? (
        <Text variant="bodySm" style={{ color: colors.danger }}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

function Score({
  name,
  score,
  count,
  accent = false,
}: {
  name: string;
  score: { answered: number; correct: number };
  count: number;
  accent?: boolean;
}): React.JSX.Element {
  return (
    <View style={{ gap: 2 }}>
      <Text variant="bodySm" style={{ color: colors.textPrimary }}>
        {name}
      </Text>
      <Text
        style={{
          fontFamily: `${fonts.mono}_500Medium`,
          fontSize: 22,
          color: accent ? colors.accent : colors.textPrimary,
        }}
      >
        {String(score.correct)}
      </Text>
      <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
        {`${String(score.answered)} / ${String(count)} répondues`}
      </Text>
    </View>
  );
}
