import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import {
  idleScoreWord,
  isSettled,
  nextDuelQuestion,
  OUTCOME_LABEL,
  otherMarks,
  outcomeOf,
  readerMarks,
  RESULT_TITLE,
  reviewRows,
  rightAnswersWord,
  tieBreakNote,
  VERDICT_LABEL,
  VERDICT_OUTCOME,
  type DuelMark,
  type DuelResultOutcome,
} from "@cyberlearn/lib/social/duel";
import { ActionChip, BackButton, GradientButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, Pill, SectionLabel, Text } from "@/components/ui";
import { answerDuelApi, fetchDuelApi, respondToDuelApi } from "@/lib/api";
import { useCosmetics } from "@/lib/cosmetics";
import { deadlineLine, DUEL_REFRESH_MS, outcomeTone, type DuelView } from "@/lib/duels";
import { pad2 } from "@/lib/exam";

/**
 * One duel, played in the app as on the site: its state and deadline, both
 * scores with a square a question, the next question, the right option shown
 * after a miss, then the result (who finished first on a tie), a rematch and
 * the reader's answers once both are done. A declined or expired duel offers
 * a new one with the same friend, and every duel leads back to the list,
 * also when it was opened from a notification. Read again every few seconds
 * while it is going on, so the other player's score moves as they answer.
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme } = useCosmetics();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    index: number;
    text: string;
    correct: boolean;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const next = nextDuelQuestion(view.questions, view.readerAnswers);
  const outcome = outcomeOf(view);
  const tone = outcomeTone(outcome, theme.accent);
  const deadline = deadlineLine(view);
  const count = view.questionCount;

  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["duel", view.id] });
    void queryClient.invalidateQueries({ queryKey: ["duels"] });
  };

  /**
   * The list again, this friend picked: a rematch, or a new try after a
   * refusal. Back to the list already under this duel when there is one,
   * rather than a second list on top; in place of the duel otherwise.
   */
  const rematch = (): void => {
    router.dismissTo({ pathname: "/duels", params: { ami: view.other.id } });
  };

  /** Every duel: the list under this one, or in its place when opened from elsewhere. */
  const allDuels = (): void => {
    router.dismissTo("/duels");
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
    setFeedback({
      index,
      correct: reply.correct,
      text: reply.correct
        ? "Bonne réponse."
        : `Raté. La bonne réponse : ${question?.options[reply.correctIndex] ?? ""}.`,
    });
    refresh();
  };

  const respond = async (accept: boolean): Promise<void> => {
    const reply = await respondToDuelApi(view.id, accept);
    if (!reply.ok) setMessage(reply.error);
    refresh();
  };

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 6 }}>
        <Text variant="micro" style={{ color: theme.accent }}>
          {`// Duel · ${view.pathTitle}`}
        </Text>
        <Text variant="h1">{`Toi contre ${view.other.name}`}</Text>
        <Text variant="bodySm">
          {`${String(count)} question${count > 1 ? "s" : ""}, les mêmes pour vous deux. Le plus de bonnes réponses gagne ; à égalité, le premier à finir.`}
        </Text>
        <View
          style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 }}
          accessibilityLiveRegion="polite"
        >
          <Pill label={OUTCOME_LABEL[outcome]} color={tone} />
          {deadline !== null ? (
            <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
              {deadline}
            </Text>
          ) : null}
        </View>
      </View>

      <Scoreboard
        view={view}
        tone={view.status === "FINISHED" ? tone : theme.accent}
        current={view.status === "ACTIVE" ? (next?.index ?? null) : null}
      />

      {view.status === "PENDING" ? (
        view.readerIsChallenger ? (
          <Waiting
            title={`Défi envoyé à ${view.other.name}`}
            text="Le duel commence quand il ou elle l'accepte, dans la journée."
          />
        ) : (
          <Card accent={theme.accent} style={{ gap: 8 }}>
            <Text variant="micro" style={{ color: theme.accent }}>
              Défi reçu
            </Text>
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
        <Card style={{ gap: 10 }}>
          <Text variant="bodySm" style={{ color: colors.textSecondary }}>
            {view.status === "DECLINED"
              ? "Ce duel a été refusé."
              : "Ce duel n'a pas été joué à temps."}
          </Text>
          <View style={{ alignSelf: "flex-start" }}>
            <ActionChip label="Relancer un duel" onPress={rematch} />
          </View>
        </Card>
      ) : null}

      {feedback !== null && view.status !== "PENDING" && view.status !== "FINISHED" ? (
        <View accessibilityLiveRegion="polite" style={{ gap: 2 }}>
          <Text variant="micro" style={{ color: colors.textMuted }}>
            {`Question ${pad2(feedback.index + 1)}`}
          </Text>
          <Text
            variant="bodySm"
            style={{ color: feedback.correct ? colors.success : colors.danger }}
          >
            {feedback.text}
          </Text>
        </View>
      ) : null}

      {view.status === "ACTIVE" && next !== null ? (
        <Card style={{ gap: 8 }}>
          <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
            {`Question ${pad2(next.index + 1)} / ${pad2(count)}${next.domain !== "" ? ` · ${next.domain}` : ""}`}
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
        <Waiting
          title="Tu as répondu à tout."
          text={`Le résultat tombe quand ${view.other.name} a fini, ou à la fin de la journée.`}
        />
      ) : null}

      {view.status === "FINISHED" && isSettled(outcome) ? (
        <Result
          view={view}
          outcome={outcome}
          tone={tone}
          onRematch={rematch}
          onAllDuels={allDuels}
        />
      ) : null}

      {message !== null ? (
        <Text variant="bodySm" style={{ color: colors.danger }}>
          {message}
        </Text>
      ) : null}

      {view.status === "FINISHED" ? (
        <Review view={view} />
      ) : (
        <View style={{ alignSelf: "flex-start" }}>
          <ActionChip label="Tous tes duels" tone="neutral" onPress={allDuels} />
        </View>
      )}
    </View>
  );
}

/** The site's waiting panel: a dashed frame in the warning tone. */
const WAITING_BORDER = `${colors.warning}8C`;

/** Waiting on the other player: what is awaited, and when it comes. */
function Waiting({ title, text }: { title: string; text: string }): React.JSX.Element {
  return (
    <Card
      style={{
        gap: 4,
        borderStyle: "dashed",
        borderColor: WAITING_BORDER,
        borderLeftColor: WAITING_BORDER,
        backgroundColor: "transparent",
      }}
    >
      <Text variant="h3">{title}</Text>
      <Text variant="bodySm">{text}</Text>
    </Card>
  );
}

/** Both players side by side: name, right answers, a square a question, the count. */
function Scoreboard({
  view,
  tone,
  current,
}: {
  view: DuelView;
  tone: string;
  current: number | null;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const idle = idleScoreWord(view.status);
  const count = view.questionCount;
  return (
    <Card accent={tone} style={{ flexDirection: "row", gap: 12 }}>
      <Side
        name="Toi"
        handle={view.reader.name}
        score={view.readerScore}
        marks={readerMarks(count, view.readerAnswers, current)}
        count={count}
        idle={idle}
        accent={theme.accent}
      />
      <View style={{ width: 1, backgroundColor: colors.borderSubtle }} />
      <View style={{ flex: 1 }} accessibilityLiveRegion="polite">
        <Side
          name={view.other.name}
          handle={view.other.username !== null ? `@${view.other.username}` : null}
          score={view.otherScore}
          marks={otherMarks(count, view.otherScore.answered)}
          count={count}
          idle={idle}
          accent={null}
        />
      </View>
    </Card>
  );
}

const MARK_COLOR: Record<DuelMark, string> = {
  right: colors.success,
  wrong: colors.danger,
  current: "transparent",
  todo: "transparent",
  done: colors.textSecondary,
};

/**
 * One player's numbers: their right answers big, a square a question and the
 * count in words. Before the duel starts, or for one never played, a dash
 * and what it means instead.
 */
function Side({
  name,
  handle,
  score,
  marks,
  count,
  idle,
  accent,
}: {
  name: string;
  handle: string | null;
  score: { answered: number; correct: number };
  marks: DuelMark[];
  count: number;
  idle: string | null;
  /** The reader's side carries the accent; the other's is plain. */
  accent: string | null;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text variant="h3" numberOfLines={1}>
        {name}
      </Text>
      {handle !== null ? (
        <Text variant="mono" numberOfLines={1} style={{ fontSize: 10.5, color: colors.textMuted }}>
          {handle}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 4 }}>
        <Text
          style={{
            fontFamily: `${fonts.mono}_500Medium`,
            fontSize: 26,
            color: idle !== null ? colors.textMuted : (accent ?? colors.textPrimary),
          }}
        >
          {idle !== null ? "–" : String(score.correct)}
        </Text>
        <Text variant="bodySm" style={{ flexShrink: 1 }}>
          {idle ?? rightAnswersWord(score.correct)}
        </Text>
      </View>
      {idle === null ? (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
            {marks.map((mark, i) => (
              <View
                key={`${String(i)}-${mark}`}
                style={{
                  width: 12,
                  height: 12,
                  borderWidth: 1,
                  borderColor:
                    mark === "current"
                      ? theme.accent
                      : mark === "todo"
                        ? colors.borderDefault
                        : MARK_COLOR[mark],
                  backgroundColor: MARK_COLOR[mark],
                }}
              />
            ))}
          </View>
          <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
            {`${String(score.answered)} / ${String(count)} répondues`}
          </Text>
        </>
      ) : null}
    </View>
  );
}

/**
 * The result in its tone, the score in words, why a tie still has a winner,
 * a rematch and the way back to every duel.
 */
function Result({
  view,
  outcome,
  tone,
  onRematch,
  onAllDuels,
}: {
  view: DuelView;
  outcome: DuelResultOutcome;
  tone: string;
  onRematch: () => void;
  onAllDuels: () => void;
}): React.JSX.Element {
  const note = tieBreakNote(view);
  return (
    <Card accent={tone} style={{ gap: 8 }}>
      <Text variant="micro" style={{ color: tone }}>
        Résultat
      </Text>
      <Text variant="display" style={{ fontSize: 26 }}>
        {RESULT_TITLE[outcome]}
      </Text>
      <Text variant="bodySm" style={{ color: colors.textSecondary }}>
        {`${String(view.readerScore.correct)} à ${String(view.otherScore.correct)} contre ${view.other.name}.`}
      </Text>
      {note !== null ? <Text variant="bodySm">{note}</Text> : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
        <GradientButton label="Rejouer" onPress={onRematch} style={{ flex: 1 }} />
        <ActionChip label="Tous tes duels" tone="neutral" onPress={onAllDuels} />
      </View>
    </Card>
  );
}

/** The reader's answers once the duel is settled: each question, their pick, the right one. */
function Review({ view }: { view: DuelView }): React.JSX.Element | null {
  const router = useRouter();
  const { theme } = useCosmetics();
  const rows = reviewRows(view.questions, view.readerAnswers);
  if (rows.length === 0) return null;
  return (
    <View>
      <SectionLabel
        title="Tes réponses"
        right={
          <ActionChip
            label="Revoir le parcours"
            tone="neutral"
            onPress={() => {
              router.push({ pathname: "/paths/[slug]", params: { slug: view.pathSlug } });
            }}
          />
        }
      />
      <View style={{ gap: 10 }}>
        {rows.map((row) => {
          const tone = outcomeTone(VERDICT_OUTCOME[row.verdict], theme.accent);
          return (
            <Card key={row.index} accent={tone} style={{ gap: 6 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <Text
                  variant="micro"
                  numberOfLines={1}
                  style={{ flex: 1, color: colors.textMuted }}
                >
                  {row.domain !== ""
                    ? `${pad2(row.index + 1)} · ${row.domain}`
                    : pad2(row.index + 1)}
                </Text>
                <Pill label={VERDICT_LABEL[row.verdict]} color={tone} />
              </View>
              <Text variant="h3">{row.question}</Text>
              <Text variant="bodySm" style={{ color: colors.textSecondary }}>
                {row.given}
              </Text>
              {row.right !== null ? (
                <Text variant="bodySm">
                  {"Bonne réponse : "}
                  <Text style={{ color: colors.textPrimary }}>{row.right}</Text>
                </Text>
              ) : null}
            </Card>
          );
        })}
      </View>
    </View>
  );
}
