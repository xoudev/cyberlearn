import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import {
  RECALL_EMPTY,
  RECALL_END_NOTE,
  RECALL_META,
  RECALL_MISSING,
  RECALL_OFF,
  RECALL_PASSAGE,
  recallVerdictTitle,
  type RecallMode,
} from "@cyberlearn/lib/revisions/recall-copy";
import { rightAnswersWord } from "@cyberlearn/lib/social/duel";
import { PopIn } from "@/components/anim";
import { ActionChip, GradientButton } from "@/components/buttons";
import { CheckIcon, CrossIcon } from "@/components/icons";
import { Card, SectionLabel, Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";
import {
  emptyRun,
  passageRoute,
  recallFlow,
  runWith,
  runWithout,
  RECALL_SEND_FAILED,
  shownQuestion,
  type RecallAnswerReply,
  type RecallPassage,
  type RecallQuestion,
  type RecallResult,
  type RecallRun,
  type RecallVerdict,
  type RecallView,
} from "@/lib/rappel";

/**
 * "Rappel du jour" and "Réviser ce module", as the site's window shows them
 * (apps/web/components/rappel/rappel-dialog.tsx), on a screen of their own.
 *
 * One question at a time, the options in the order the server drew them.
 * The answer is checked on the server and final; the screen then says
 * whether it was right, which option was, why (the explanation the author
 * wrote) and leads back to the passage of the lesson. The day's recall keeps
 * its answers on the server: left halfway, it opens again on the next
 * question, and the last answer hands it in for its XP. A module's review is
 * a free run, without XP, kept on this screen only.
 *
 * The screen never says how many questions wait beyond today's: only where
 * the reader is in the few asked now.
 */

const KEYS = ["A", "B", "C", "D", "E", "F", "G", "H"];

/** The title over the questions: what is reviewed, and what to expect while it is open. */
export function RecallHeader({
  mode,
  view,
}: {
  mode: RecallMode;
  view: RecallView | undefined;
}): React.JSX.Element {
  const daily = mode === "daily";
  const title = view?.title ?? (daily ? "Rappel du jour" : "Réviser ce module");
  return (
    <View style={{ gap: 4 }}>
      <SectionLabel eyebrow={daily ? "Révisions" : "Réviser ce module"} title={title} />
      {view === undefined || view.status === "open" ? (
        <Text variant="bodySm" style={{ marginTop: -6, marginBottom: 12 }}>
          {RECALL_META[mode]}
        </Text>
      ) : null}
    </View>
  );
}

export function RecallFlow({
  view,
  answer,
  reread,
  onAnswered,
  onOpenSettings,
}: {
  view: RecallView;
  /** Sends one answer; null when it could not be sent or its verdict not read. */
  answer: (question: RecallQuestion, selected: number) => Promise<RecallAnswerReply | null>;
  /**
   * Reads the view again after the server refused an answer (the day's
   * recall: answered on the site or in another session, gone from its
   * lesson, a day old, handed in, switched off). A module's review has
   * nothing to read back: it sets the question aside instead.
   */
  reread: () => Promise<void>;
  /** An answer recorded: the verdict, and the hand-in when it was the last. */
  onAnswered?: (verdict: RecallVerdict, result: RecallResult | null) => void;
  onOpenSettings: () => void;
}): React.JSX.Element {
  const [run, setRun] = useState<RecallRun>(() => emptyRun(view.day));
  /** The question the reader is on; undefined before any, null at the end. */
  const [pinned, setPinned] = useState<number | null | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (view.status === "off") {
    return (
      <Card style={{ gap: 10 }}>
        <Text variant="body">{RECALL_OFF}</Text>
        <GradientButton label="Ouvrir les réglages" onPress={onOpenSettings} />
      </Card>
    );
  }
  if (view.status === "missing") return <Quiet text={RECALL_MISSING} />;

  const flow = recallFlow(view, run);
  if (view.status === "empty" || flow.questions.length === 0) {
    return <Quiet text={RECALL_EMPTY[view.mode]} />;
  }

  const current = shownQuestion(flow, pinned);
  const question = flow.questions.find((q) => q.index === current) ?? null;
  const verdict = flow.verdicts.find((v) => v.index === current) ?? null;

  const pick = async (asked: RecallQuestion, selected: number): Promise<void> => {
    if (pending) return;
    setPinned(asked.index);
    setPending(true);
    setError(null);
    const reply = await answer(asked, selected);
    if (reply === null) {
      // Perhaps never arrived: the question stays, to be answered again.
      setError(RECALL_SEND_FAILED);
    } else if (reply.ok) {
      setRun((prev) => runWith(view, prev, reply.verdict, reply.result));
      onAnswered?.(reply.verdict, reply.result);
    } else {
      setError(reply.error);
      if (view.mode === "daily") {
        // Read back, the recall says what the server knows: the verdict
        // given elsewhere, the next question, today's recall, the end.
        await reread();
      } else {
        setRun((prev) => runWithout(view, prev, asked.index));
      }
    }
    setPending(false);
  };

  const goOn = (): void => {
    setError(null);
    if (flow.next !== null) {
      setPinned(flow.next);
      return;
    }
    // Every question answered. The day's recall was handed in by the last
    // answer, here or elsewhere: read it back if this screen missed it.
    setPinned(null);
    if (view.mode === "daily" && flow.result === null) void reread();
  };

  if (current === null) {
    return flow.result !== null ? (
      <End
        mode={view.mode}
        result={flow.result}
        questions={flow.questions}
        verdicts={flow.verdicts}
      />
    ) : (
      // Every answer given, the hand-in being read back.
      <Text variant="bodySm" accessibilityRole="progressbar">
        Chargement…
      </Text>
    );
  }
  if (question === null) return <Quiet text={RECALL_EMPTY[view.mode]} />;

  const position = flow.questions.findIndex((q) => q.index === question.index) + 1;
  return (
    <View style={{ gap: 14 }}>
      <Pips questions={flow.questions} verdicts={flow.verdicts} current={current} />
      <QuestionCard
        question={question}
        verdict={verdict}
        position={position}
        total={flow.questions.length}
        pending={pending}
        onPick={(selected) => void pick(question, selected)}
      />
      {error !== null ? (
        <Text variant="bodySm" style={{ color: colors.danger }} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      {verdict !== null ? (
        <GradientButton
          label={flow.next === null ? "Voir le bilan" : "Question suivante"}
          onPress={goOn}
        />
      ) : null}
    </View>
  );
}

/** Nothing to ask, or nothing to open: one sentence in a quiet frame. */
function Quiet({ text }: { text: string }): React.JSX.Element {
  return (
    <Card>
      <Text variant="body">{text}</Text>
    </Card>
  );
}

const PIP_COLOR = {
  right: colors.success,
  wrong: colors.danger,
  current: "transparent",
  todo: "transparent",
} as const;

/** A square a question: right, missed, on screen, or still to answer. Decorative. */
function Pips({
  questions,
  verdicts,
  current,
}: {
  questions: readonly RecallQuestion[];
  verdicts: readonly RecallVerdict[];
  current: number;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const byIndex = new Map(verdicts.map((v) => [v.index, v]));
  return (
    <View
      style={{ flexDirection: "row", gap: 6 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {questions.map((q) => {
        const given = byIndex.get(q.index);
        const state =
          given === undefined
            ? q.index === current
              ? "current"
              : "todo"
            : given.correct
              ? "right"
              : "wrong";
        return (
          <View
            key={q.index}
            style={{
              width: 14,
              height: 14,
              borderWidth: 1,
              borderColor:
                state === "current"
                  ? theme.accent
                  : state === "todo"
                    ? colors.borderDefault
                    : PIP_COLOR[state],
              backgroundColor: PIP_COLOR[state],
            }}
          />
        );
      })}
    </View>
  );
}

/** "Revoir ce passage": the lesson, on the question's section, where the app can open it. */
function PassageLink({ passage }: { passage: RecallPassage }): React.JSX.Element | null {
  const router = useRouter();
  const route = passageRoute(passage.href);
  if (route === null) return null;
  return (
    <View style={{ alignSelf: "flex-start" }}>
      <ActionChip
        label={`${RECALL_PASSAGE} →`}
        tone="neutral"
        onPress={() => {
          router.push(route);
        }}
      />
    </View>
  );
}

/** The question on screen, its options, and once answered, the verdict. */
function QuestionCard({
  question,
  verdict,
  position,
  total,
  pending,
  onPick,
}: {
  question: RecallQuestion;
  verdict: RecallVerdict | null;
  position: number;
  total: number;
  pending: boolean;
  onPick: (selected: number) => void;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const right = verdict !== null ? question.options[verdict.correctIndex] : undefined;
  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 6 }}>
        <Text variant="micro" style={{ color: theme.accent }}>
          Question {position} sur {total} · {question.lessonTitle}
        </Text>
        <Text variant="h2">{question.question}</Text>
      </View>
      <View style={{ gap: 8 }}>
        {question.options.map((option, k) => {
          const state =
            verdict === null
              ? "idle"
              : k === verdict.correctIndex
                ? "right"
                : k === verdict.selected
                  ? "wrong"
                  : "idle";
          const border =
            state === "right"
              ? colors.success
              : state === "wrong"
                ? colors.danger
                : colors.borderDefault;
          const closed = verdict !== null || pending;
          return (
            <Pressable
              // SAFETY: the options of one question do not reorder while it is shown.
              key={k}
              onPress={() => {
                onPick(k);
              }}
              disabled={closed}
              accessibilityRole="button"
              accessibilityState={{
                disabled: closed,
                selected: verdict !== null && k === verdict.selected,
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                minHeight: 48,
                padding: 14,
                borderWidth: 1.5,
                borderColor: border,
                backgroundColor: pressed && !closed ? `${theme.accent}14` : colors.bgElevated,
                opacity: pending && verdict === null ? 0.6 : 1,
              })}
            >
              <Text
                variant="mono"
                style={{
                  fontSize: 12,
                  color:
                    state === "right"
                      ? colors.success
                      : state === "wrong"
                        ? colors.danger
                        : colors.textMuted,
                }}
              >
                {KEYS[k] ?? String(k + 1)}
              </Text>
              <Text variant="body" style={{ flex: 1, color: colors.textPrimary }}>
                {option}
              </Text>
              {state === "right" ? (
                <CheckIcon color={colors.success} size={16} strokeWidth={2} />
              ) : state === "wrong" ? (
                <CrossIcon color={colors.danger} size={16} strokeWidth={2} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <View accessibilityLiveRegion="polite">
        {verdict !== null ? (
          <PopIn>
            <View
              style={{
                borderLeftWidth: 3,
                borderLeftColor: verdict.correct ? colors.success : colors.danger,
                backgroundColor: verdict.correct ? `${colors.success}12` : `${colors.danger}12`,
                padding: 12,
                gap: 8,
              }}
            >
              <Text
                variant="h3"
                style={{ color: verdict.correct ? colors.success : colors.danger }}
              >
                {recallVerdictTitle(verdict.correct, right ?? KEYS[verdict.correctIndex] ?? "")}
              </Text>
              {verdict.explanation !== null ? (
                <Text variant="bodySm" style={{ color: colors.textSecondary }}>
                  {verdict.explanation}
                </Text>
              ) : null}
              {verdict.passage !== null ? <PassageLink passage={verdict.passage} /> : null}
            </View>
          </PopIn>
        ) : null}
      </View>
    </View>
  );
}

/** The end: how it went, the XP when there is some, and each question with the way back to it. */
function End({
  mode,
  result,
  questions,
  verdicts,
}: {
  mode: RecallMode;
  result: RecallResult;
  questions: readonly RecallQuestion[];
  verdicts: readonly RecallVerdict[];
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const byIndex = new Map(questions.map((q) => [q.index, q]));
  return (
    <View style={{ gap: 14 }}>
      <Card accent={theme.accent} style={{ gap: 6 }} accessibilityLiveRegion="polite">
        {result.xp > 0 ? (
          <PopIn>
            <Text variant="display" style={{ color: theme.accent }}>
              +{result.xp} XP
            </Text>
          </PopIn>
        ) : null}
        <Text variant="h2">
          {result.correct} {rightAnswersWord(result.correct)} sur {result.total}
        </Text>
        <Text variant="bodySm">{RECALL_END_NOTE[mode]}</Text>
      </Card>
      {verdicts.length > 0 ? (
        <View style={{ gap: 8 }}>
          {verdicts.map((given) => {
            const asked = byIndex.get(given.index);
            if (asked === undefined) return null;
            return (
              <View
                key={given.index}
                style={{
                  flexDirection: "row",
                  gap: 10,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.borderSubtle,
                }}
              >
                <View
                  style={{ paddingTop: 2 }}
                  accessible
                  accessibilityLabel={given.correct ? "Juste" : "Raté"}
                >
                  {given.correct ? (
                    <CheckIcon color={colors.success} size={15} strokeWidth={2} />
                  ) : (
                    <CrossIcon color={colors.danger} size={15} strokeWidth={2} />
                  )}
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="micro">{asked.lessonTitle}</Text>
                  <Text variant="body" style={{ color: colors.textPrimary }}>
                    {asked.question}
                  </Text>
                  {!given.correct && given.passage !== null ? (
                    <PassageLink passage={given.passage} />
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
