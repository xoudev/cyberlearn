import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, ScrollView, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import {
  ANSWER_WORD,
  answerCounts,
  answerState,
  bestScore,
  domainVerdict,
  lastDomainScores,
  MOCK_LAST_MINUTE_MS,
  mockAdvice,
  mockClock,
  mockParts,
  optionKey,
  optionTag,
  unansweredQuestions,
  verdictTone,
  weakestDomains,
  type DomainScore,
  type MockAnswerState,
  type MockPart,
  type MockQuestion,
  type MockResult,
  type MockReviewItem,
  type VerdictTone,
} from "@cyberlearn/lib/exam/mock";
import { Rise } from "@/components/anim";
import { ActionChip, BackButton, GradientButton } from "@/components/buttons";
import { CheckIcon, ClockIcon, CrossIcon } from "@/components/icons";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/states";
import { Card, Pill, SectionLabel, StatCell, Text, XPBar } from "@/components/ui";
import { fetchMockOverviewApi, startMockExamApi, submitMockExamApi } from "@/lib/api";
import { useCosmetics } from "@/lib/cosmetics";
import { pad2 } from "@/lib/exam";
import { attemptDay, handedInSince, type MockOverview } from "@/lib/mock-exam";

/**
 * The site's mock exam, in the app: what it covers, its rules, the last score
 * of each module and the attempts made; then the questions by module with the
 * clock (handed in by itself at zero) and what is still blank; then the score
 * by module, what to go back to, the answers right, wrong and blank, and the
 * correction. The draw and the score are the server's (/api/mobile/mock-exam),
 * as on the site.
 */

/**
 * Where the screen is. An intro `handedIn` is back from a paper whose copy
 * went in though its reply was lost: its score is in the history.
 */
type Stage =
  | { kind: "intro"; handedIn: boolean }
  | {
      kind: "running";
      attemptId: string;
      startedAt: string;
      deadline: number;
      questions: MockQuestion[];
    }
  | { kind: "result"; result: MockResult; late: boolean };

/** A verdict's colour: amber only ever means "à consolider". */
const TONE_COLOR: Record<VerdictTone, string> = {
  ok: colors.success,
  mid: colors.warning,
  low: colors.danger,
};

/** A question of the correction: a blank stays neutral, told apart from a wrong answer. */
const ANSWER_COLOR: Record<MockAnswerState, string> = {
  right: colors.success,
  wrong: colors.danger,
  blank: colors.textMuted,
};

/** The intro's line when a copy whose reply was lost turns out to be in. */
const HANDED_IN_NOTE =
  "Ta copie a bien été rendue, mais sa correction n'a pas pu s'afficher : retrouve son score dans tes examens blancs, plus bas.";

function toneColor(percent: number): string {
  return TONE_COLOR[verdictTone(percent)];
}

function plural(n: number, word: string): string {
  return n > 1 ? `${word}s` : word;
}

export default function MockExamScreen(): React.JSX.Element {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["mock-exam", slug],
    enabled: Boolean(slug),
    queryFn: () => fetchMockOverviewApi(slug ?? ""),
  });

  // Only the first load has no data: the refetch after a hand-in that fails
  // keeps the result on screen.
  if (data === undefined) {
    return (
      <Screen>
        <View style={{ marginBottom: 16 }}>
          <BackButton label="Parcours" />
        </View>
        {isLoading ? (
          <ListSkeleton rows={4} />
        ) : (
          <ErrorState onRetry={() => void refetch()} code="MOCK_EXAM_LOAD" />
        )}
      </Screen>
    );
  }

  return (
    <MockExamFlow
      overview={data}
      onStale={async () => {
        const fresh = await refetch();
        return fresh.data;
      }}
    />
  );
}

/** The three stages, and the attempt's answers and clock between the start and the hand-in. */
function MockExamFlow({
  overview,
  onStale,
}: {
  overview: MockOverview;
  /** Fetches the overview again, and gives it back once it is in. */
  onStale: () => Promise<MockOverview | undefined>;
}): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<Stage>({ kind: "intro", handedIn: false });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const submitting = useRef(false);
  const autoSent = useRef(false);

  const start = async (): Promise<void> => {
    setBusy(true);
    setMessage(null);
    const started = await startMockExamApi(overview.pathId);
    setBusy(false);
    if (!started.ok) {
      setMessage(started.error);
      return;
    }
    setAnswers({});
    submitting.current = false;
    autoSent.current = false;
    setNow(Date.now());
    setStage({
      kind: "running",
      attemptId: started.attemptId,
      startedAt: started.startedAt,
      deadline: new Date(started.startedAt).getTime() + started.timeLimitMinutes * 60_000,
      questions: started.questions,
    });
  };

  const submit = useCallback(async (): Promise<void> => {
    if (stage.kind !== "running" || submitting.current) return;
    const { attemptId, startedAt } = stage;
    submitting.current = true;
    setBusy(true);
    setMessage(null);
    const handed = await submitMockExamApi(attemptId, answers);
    setBusy(false);
    if (!handed.ok) {
      submitting.current = false;
      setMessage(handed.error);
      // What was lost may be the reply, not the copy: the history says which.
      // Then the paper gives way to the intro, where its score is.
      const fresh = await onStale();
      if (fresh !== undefined && handedInSince(fresh.history, startedAt)) {
        setStage((current) =>
          current.kind === "running" && current.attemptId === attemptId
            ? { kind: "intro", handedIn: true }
            : current,
        );
        setMessage(null);
      }
      return;
    }
    setStage({ kind: "result", result: handed.result, late: handed.late });
    void queryClient.invalidateQueries({ queryKey: ["mock-exam", overview.pathSlug] });
  }, [stage, answers, onStale, queryClient, overview.pathSlug]);

  // The clock: a tick a second while running. At 00:00 the copy goes in once;
  // if that fails, the hand-in buttons stay to send it again.
  useEffect(() => {
    if (stage.kind !== "running") return;
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [stage.kind]);
  useEffect(() => {
    if (stage.kind !== "running" || now < stage.deadline || autoSent.current) return;
    autoSent.current = true;
    void submit();
  }, [now, stage, submit]);

  const parts = useMemo(
    () => (stage.kind === "running" ? mockParts(stage.questions) : []),
    [stage],
  );

  const backToPath = (): void => {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: "/paths/[slug]", params: { slug: overview.pathSlug } });
  };

  if (stage.kind === "running") {
    return (
      <PaperView
        pathTitle={overview.pathTitle}
        parts={parts}
        total={stage.questions.length}
        answers={answers}
        left={stage.deadline - now}
        busy={busy}
        error={message}
        onPick={(index, k) => {
          setAnswers((prev) => ({ ...prev, [String(index)]: k }));
        }}
        onSubmit={() => void submit()}
      />
    );
  }

  if (stage.kind === "result") {
    return (
      <ResultView
        result={stage.result}
        late={stage.late}
        busy={busy}
        error={message}
        onRestart={() => void start()}
        onBack={backToPath}
      />
    );
  }

  return (
    <IntroView
      overview={overview}
      handedIn={stage.handedIn}
      busy={busy}
      error={message}
      onStart={() => void start()}
      onBack={backToPath}
    />
  );
}

// ── Small pieces ─────────────────────────────────────────────────────────────

/** A score as a bar, in its verdict's colour. */
function Meter({ percent, color }: { percent: number; color: string }): React.JSX.Element {
  return (
    <View style={{ height: 5, backgroundColor: colors.borderSubtle }}>
      <View
        style={{
          width: `${Math.max(0, Math.min(100, percent))}%`,
          height: 5,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** One of the exam's rules: what it is, then what it means. */
function Rule({ title, body }: { title: string; body: string }): React.JSX.Element {
  return (
    <View
      style={{
        gap: 3,
        paddingLeft: 12,
        borderLeftWidth: 2,
        borderLeftColor: colors.borderDefault,
      }}
    >
      <Text variant="h3">{title}</Text>
      <Text variant="bodySm">{body}</Text>
    </View>
  );
}

/** A line set apart by a coloured edge: an attempt still running, a path not ready. */
function Note({ tone, children }: { tone: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <View
      style={{
        borderLeftWidth: 3,
        borderLeftColor: tone,
        backgroundColor: colors.bgElevated,
        padding: 12,
      }}
    >
      <Text variant="bodySm" style={{ color: colors.textSecondary }}>
        {children}
      </Text>
    </View>
  );
}

/** A failed start or hand-in; only one copy on screen is read out. */
function ErrorLine({
  error,
  announce = true,
}: {
  error: string | null;
  announce?: boolean;
}): React.JSX.Element | null {
  if (error === null) return null;
  return (
    <Text
      variant="bodySm"
      accessibilityRole={announce ? "alert" : undefined}
      accessibilityLiveRegion={announce ? "polite" : "none"}
      style={{ color: colors.danger }}
    >
      {error}
    </Text>
  );
}

// ── Intro ────────────────────────────────────────────────────────────────────

/**
 * Before an attempt: the path, what the exam is and its three figures, the
 * rules a practice run actually has, and the way in; then the modules it
 * covers, numbered (with the last score of each, once there is one), and the
 * attempts already handed in, with the best of them.
 */
function IntroView({
  overview,
  handedIn,
  busy,
  error,
  onStart,
  onBack,
}: {
  overview: MockOverview;
  handedIn: boolean;
  busy: boolean;
  error: string | null;
  onStart: () => void;
  onBack: () => void;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const { history } = overview;
  const lastByDomain = lastDomainScores(history);
  const best = bestScore(history);
  const moduleCount = overview.domains.length;

  // The paper gave way to this screen: said, since the focus was on the paper.
  useEffect(() => {
    if (handedIn) AccessibilityInfo.announceForAccessibility(HANDED_IN_NOTE);
  }, [handedIn]);

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackButton label="Parcours" />
      </View>

      <View style={{ gap: 20 }}>
        {/* One block: Rise alone renders a fragment, which the column's gap
            would space out like three sections. */}
        <Rise index={0}>
          <View style={{ gap: 8 }}>
            <Text variant="micro" style={{ color: theme.accent }}>
              {"// Examen blanc"}
            </Text>
            <Text variant="display" style={{ fontSize: 26 }}>
              {overview.pathTitle}
            </Text>
            <Text variant="body" style={{ marginTop: 4 }}>
              {`${String(overview.questionCount)} questions tirées des quiz du parcours, trois par module, en ${String(overview.timeLimitMinutes)} minutes. Comme à une certification, le score se lit par module : chaque module dit ce qui est acquis et ce qui reste à revoir.`}
            </Text>
          </View>
        </Rise>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <StatCell value={overview.questionCount} label="Questions" />
          <StatCell value={`${String(overview.timeLimitMinutes)} min`} label="Chrono" />
          <StatCell
            value={moduleCount}
            label={plural(moduleCount, "Module")}
            accent={theme.accent}
          />
        </View>

        <Card style={{ gap: 14 }}>
          <Rule
            title="Chrono"
            body="Il part dès que tu commences et ne s'arrête plus. À 00:00, ta copie est rendue telle quelle."
          />
          <Rule
            title="Verdict"
            body="Chaque module reçoit le sien : acquis, à consolider ou à revoir, avec la correction de chaque question."
          />
          <Rule
            title="Sans enjeu"
            body="C'est un entraînement : ni certificat, ni XP, autant de fois que tu veux."
          />
        </Card>

        <View style={{ gap: 10 }}>
          {handedIn ? <Note tone={colors.success}>{HANDED_IN_NOTE}</Note> : null}
          {overview.ready && overview.running !== null ? (
            <Note tone={colors.warning}>
              Un examen blanc est en cours : le chrono tourne toujours. Tes réponses d&apos;avant ne
              sont pas gardées.
            </Note>
          ) : null}
          {overview.ready ? null : (
            <Note tone={colors.textMuted}>
              Ce parcours n&apos;a pas encore assez de questions pour un examen blanc.
            </Note>
          )}
          <ErrorLine error={error} />
          {overview.ready ? (
            <GradientButton
              label={
                overview.running !== null
                  ? "Reprendre l'examen en cours"
                  : "Commencer l'examen blanc"
              }
              loading={busy}
              onPress={onStart}
            />
          ) : null}
          <View style={{ alignSelf: "flex-start" }}>
            <ActionChip label="Retour au parcours" tone="neutral" onPress={onBack} />
          </View>
        </View>

        <View>
          <SectionLabel
            title="Les modules couverts"
            right={
              <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
                {`${String(moduleCount)} ${plural(moduleCount, "module")}`}
              </Text>
            }
          />
          {moduleCount > 0 ? (
            <Card style={{ gap: 12 }}>
              {overview.domains.map((domain, i) => {
                const last = lastByDomain.get(domain.domain);
                return (
                  <View
                    key={domain.domain}
                    style={{
                      flexDirection: "row",
                      gap: 10,
                      paddingTop: i === 0 ? 0 : 12,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: colors.borderSubtle,
                    }}
                  >
                    <Text
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                      style={{
                        width: 20,
                        fontFamily: `${fonts.mono}_700Bold`,
                        fontSize: 11,
                        lineHeight: 18,
                        color: theme.accent,
                      }}
                    >
                      {pad2(i + 1)}
                    </Text>
                    <View style={{ flex: 1, gap: 4 }}>
                      <View
                        style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}
                      >
                        <Text variant="bodySm" style={{ flex: 1, color: colors.textPrimary }}>
                          {domain.domain}
                        </Text>
                        <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
                          {`${String(domain.drawn)} ${plural(domain.drawn, "question")}`}
                        </Text>
                      </View>
                      {last !== undefined ? (
                        <Text
                          variant="mono"
                          style={{ fontSize: 11, color: toneColor(last.percent) }}
                        >
                          {`Dernier examen : ${String(last.correct)} / ${String(last.total)} · ${domainVerdict(last.percent)}`}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </Card>
          ) : (
            <Text variant="bodySm">Aucun module de ce parcours n&apos;a encore de quiz.</Text>
          )}
        </View>

        <View>
          <SectionLabel
            title="Tes examens blancs"
            right={
              best !== null ? (
                <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
                  {`${String(history.length)} derniers · meilleur ${String(best)} %`}
                </Text>
              ) : undefined
            }
          />
          {history.length > 0 ? (
            <Card style={{ gap: 12 }}>
              {history.map((attempt) => {
                const color = toneColor(attempt.score);
                return (
                  <View key={attempt.submittedAt} style={{ gap: 6 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text variant="bodySm" style={{ flex: 1 }}>
                        {attemptDay(attempt.submittedAt)}
                      </Text>
                      {attempt.late ? (
                        <Text variant="micro" style={{ color: colors.textMuted }}>
                          hors délai
                        </Text>
                      ) : null}
                      <Text variant="mono" style={{ fontSize: 12, color }}>
                        {`${String(attempt.score)} %`}
                      </Text>
                    </View>
                    <Meter percent={attempt.score} color={color} />
                  </View>
                );
              })}
            </Card>
          ) : (
            <Text variant="bodySm">
              Aucun examen blanc rendu sur ce parcours pour l&apos;instant : tes scores
              s&apos;afficheront ici.
            </Text>
          )}
        </View>
      </View>
    </Screen>
  );
}

// ── Paper ────────────────────────────────────────────────────────────────────

/** One question: its number and whether it has an answer, then its options as keyed rows. */
function QuestionCard({
  question,
  picked,
  onPick,
  onPlaced,
  headRef,
}: {
  question: MockQuestion;
  picked: number | undefined;
  onPick: (k: number) => void;
  /** Where the card sits in the paper's scroll, for the way back to a blank question. */
  onPlaced: (y: number) => void;
  /** The card's first line, where the screen reader lands on the way back. */
  headRef: (node: View | null) => void;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const answered = picked !== undefined;
  return (
    <Card
      accent={answered ? theme.accent : undefined}
      style={{ gap: 10 }}
      onLayout={(event) => {
        onPlaced(event.nativeEvent.layout.y);
      }}
    >
      <View
        ref={headRef}
        accessible
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
      >
        <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
          Question <Text style={{ color: colors.textPrimary }}>{pad2(question.index + 1)}</Text>
        </Text>
        <Text variant="micro" style={{ color: answered ? theme.accent : colors.textMuted }}>
          {answered ? "Répondue" : "Sans réponse"}
        </Text>
      </View>
      <Text variant="h3">{question.question}</Text>
      <View
        style={{ gap: 8 }}
        accessibilityRole="radiogroup"
        accessibilityLabel={question.question}
      >
        {question.options.map((option, k) => {
          const selected = picked === k;
          return (
            <Pressable
              key={k}
              accessibilityRole="radio"
              accessibilityLabel={option}
              accessibilityState={{ checked: selected }}
              onPress={() => {
                onPick(k);
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                minHeight: 48,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: selected ? theme.accent : colors.borderDefault,
                backgroundColor: selected ? `${theme.accent}10` : "transparent",
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text
                variant="mono"
                style={{ fontSize: 12, color: selected ? theme.accent : colors.textMuted }}
              >
                {optionKey(k)}
              </Text>
              <Text variant="bodySm" style={{ flex: 1, color: colors.textPrimary }}>
                {option}
              </Text>
              {selected ? <CheckIcon color={theme.accent} size={15} strokeWidth={2} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

/**
 * The paper: pinned above it, the exam's name, the clock (red, and saying so,
 * in its last minute), how many questions have an answer and the hand-in;
 * under it the questions by module, and at the foot the hand-in again with
 * what is still blank and a way back to each of those questions.
 */
function PaperView({
  pathTitle,
  parts,
  total,
  answers,
  left,
  busy,
  error,
  onPick,
  onSubmit,
}: {
  pathTitle: string;
  parts: MockPart[];
  total: number;
  answers: Record<string, number>;
  left: number;
  busy: boolean;
  error: string | null;
  onPick: (index: number, k: number) => void;
  onSubmit: () => void;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const scrollRef = useRef<ScrollView>(null);
  const placed = useRef(new Map<number, number>());
  const heads = useRef(new Map<number, View>());
  const answered = Object.keys(answers).length;
  const blank = unansweredQuestions(
    parts.flatMap((part) => part.questions),
    answers,
  );
  const low = left < MOCK_LAST_MINUTE_MS;
  const clockColor = low ? colors.danger : theme.accent;
  const clock = mockClock(left);

  // Said once as the clock enters its last minute, for whoever does not see it turn red.
  useEffect(() => {
    if (low) AccessibilityInfo.announceForAccessibility("Moins d'une minute restante.");
  }, [low]);

  // The question in view, and the screen reader's focus on it, as the site
  // moves the keyboard's.
  const goTo = (index: number): void => {
    const y = placed.current.get(index);
    if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
    const head = heads.current.get(index);
    if (head !== undefined) AccessibilityInfo.sendAccessibilityEvent(head, "focus");
  };

  return (
    <Screen scroll={false}>
      <View style={{ marginBottom: 12 }}>
        <BackButton label="Parcours" />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="micro" style={{ color: theme.accent }}>
            {"// Examen blanc"}
          </Text>
          <Text variant="h3" numberOfLines={1}>
            {pathTitle}
          </Text>
        </View>
        <View
          accessibilityRole="timer"
          accessibilityLabel={`Temps restant : ${clock}`}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            minHeight: 40,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: clockColor,
            backgroundColor: low ? `${colors.danger}14` : "transparent",
          }}
        >
          <ClockIcon color={clockColor} size={15} />
          <Text
            style={{
              fontFamily: `${fonts.mono}_700Bold`,
              fontSize: 16,
              color: clockColor,
              fontVariant: ["tabular-nums"],
            }}
          >
            {clock}
          </Text>
          {low ? (
            <Text variant="micro" style={{ color: colors.danger }}>
              Dernière minute
            </Text>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
            {`${String(answered)} / ${String(total)} répondues`}
          </Text>
          <XPBar current={answered} needed={Math.max(total, 1)} height={4} />
        </View>
        <ActionChip label="Rendre la copie" onPress={onSubmit} disabled={busy} />
      </View>

      {error !== null ? (
        <View style={{ marginBottom: 10 }}>
          <ErrorLine error={error} />
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 10, paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {parts.map((part, p) => (
          <React.Fragment key={part.domain}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 8,
                marginTop: p === 0 ? 0 : 10,
              }}
            >
              <Text variant="micro" style={{ flex: 1, color: theme.accent, letterSpacing: 1.5 }}>
                {`// Module · ${part.domain}`}
              </Text>
              <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
                {`${String(part.questions.length)} ${plural(part.questions.length, "question")}`}
              </Text>
            </View>
            {part.questions.map((question) => (
              <QuestionCard
                key={question.index}
                question={question}
                picked={answers[String(question.index)]}
                onPick={(k) => {
                  onPick(question.index, k);
                }}
                onPlaced={(y) => {
                  placed.current.set(question.index, y);
                }}
                headRef={(node) => {
                  if (node === null) heads.current.delete(question.index);
                  else heads.current.set(question.index, node);
                }}
              />
            ))}
          </React.Fragment>
        ))}

        <Card
          accent={blank.length === 0 ? theme.accent : undefined}
          style={{ gap: 12, marginTop: 10 }}
        >
          {blank.length > 0 ? (
            <>
              <Text variant="bodySm" style={{ color: colors.textSecondary }}>
                <Text
                  style={{ color: colors.textPrimary, fontFamily: `${fonts.sans}_600SemiBold` }}
                >
                  {`${String(blank.length)} ${plural(blank.length, "question")} sans réponse.`}
                </Text>{" "}
                Une question laissée vide compte comme fausse.
              </Text>
              <View
                accessibilityLabel="Les questions sans réponse"
                style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
              >
                {blank.map((question) => (
                  <Pressable
                    key={question.index}
                    accessibilityRole="button"
                    accessibilityLabel={`Aller à la question ${pad2(question.index + 1)}`}
                    hitSlop={4}
                    onPress={() => {
                      goTo(question.index);
                    }}
                    style={({ pressed }) => ({
                      width: 44,
                      height: 44,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: pressed ? theme.accent : colors.borderDefault,
                      backgroundColor: pressed ? `${theme.accent}14` : "transparent",
                    })}
                  >
                    <Text variant="mono" style={{ fontSize: 11, color: theme.accent }}>
                      {pad2(question.index + 1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <Text variant="bodySm" style={{ color: colors.textSecondary }}>
              <Text style={{ color: colors.textPrimary, fontFamily: `${fonts.sans}_600SemiBold` }}>
                Toutes les questions ont une réponse.
              </Text>{" "}
              Relis-toi si tu veux, puis rends ta copie.
            </Text>
          )}
          <ErrorLine error={error} announce={false} />
          <GradientButton label="Rendre la copie" loading={busy} onPress={onSubmit} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

// ── Result ───────────────────────────────────────────────────────────────────

/** The way out of a result: another draw, or back to the path. */
function ResultActions({
  busy,
  error,
  announce,
  onRestart,
  onBack,
}: {
  busy: boolean;
  error: string | null;
  announce: boolean;
  onRestart: () => void;
  onBack: () => void;
}): React.JSX.Element {
  return (
    <View style={{ gap: 10 }}>
      <ErrorLine error={error} announce={announce} />
      <GradientButton
        label="Recommencer avec d'autres questions"
        loading={busy}
        onPress={onRestart}
      />
      <View style={{ alignSelf: "flex-start" }}>
        <ActionChip label="Retour au parcours" tone="neutral" onPress={onBack} />
      </View>
    </View>
  );
}

/** A module's score: its verdict, and whether it is one to go back to first. */
function DomainRow({ domain, first }: { domain: DomainScore; first: boolean }): React.JSX.Element {
  const color = toneColor(domain.percent);
  return (
    <Card accent={color} style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text variant="bodySm" style={{ color: colors.textPrimary }}>
            {domain.domain}
          </Text>
          {first ? (
            <View style={{ alignSelf: "flex-start" }}>
              <Pill label="En premier" color={color} />
            </View>
          ) : null}
        </View>
        <Text variant="mono" style={{ fontSize: 11, color }}>
          {`${String(domain.correct)} / ${String(domain.total)} · ${domainVerdict(domain.percent)}`}
        </Text>
      </View>
      <Meter percent={domain.percent} color={color} />
    </Card>
  );
}

/** A question of the correction, opened by default when it was not right. */
function ReviewRow({
  item,
  open,
  onToggle,
}: {
  item: MockReviewItem;
  open: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const state = answerState(item);
  const color = ANSWER_COLOR[state];
  return (
    <Card accent={color} style={{ padding: 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 }}
      >
        <View style={{ width: 15, paddingTop: 2, alignItems: "center" }}>
          {state === "right" ? (
            <CheckIcon color={color} size={15} strokeWidth={2.2} />
          ) : state === "wrong" ? (
            <CrossIcon color={color} size={15} strokeWidth={2.2} />
          ) : (
            <View style={{ width: 10, height: 2, marginTop: 6, backgroundColor: color }} />
          )}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="micro" style={{ color }}>
            {`Question ${pad2(item.index + 1)} · ${ANSWER_WORD[state]} · ${item.domain}`}
          </Text>
          <Text variant="h3">{item.question}</Text>
        </View>
      </Pressable>
      {open ? (
        <View style={{ gap: 8, paddingHorizontal: 14, paddingBottom: 14 }}>
          {item.options.map((option, k) => {
            const right = k === item.correct;
            const picked = k === item.selected;
            const tag = optionTag(item, k);
            const optionColor = right ? colors.success : picked ? colors.danger : colors.textMuted;
            return (
              <View
                key={k}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: tag === null ? colors.borderSubtle : optionColor,
                }}
              >
                <Text variant="mono" style={{ fontSize: 11, color: optionColor }}>
                  {optionKey(k)}
                </Text>
                <Text variant="bodySm" style={{ flex: 1, color: colors.textPrimary }}>
                  {option}
                </Text>
                {tag !== null ? (
                  <Text variant="micro" style={{ color: optionColor }}>
                    {tag}
                  </Text>
                ) : null}
              </View>
            );
          })}
          {state === "blank" ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                padding: 10,
                borderWidth: 1,
                borderColor: colors.textMuted,
              }}
            >
              <Text variant="bodySm" style={{ flex: 1, color: colors.textSecondary }}>
                Aucune réponse donnée
              </Text>
              <Text variant="micro" style={{ color: colors.textMuted }}>
                Ta réponse
              </Text>
            </View>
          ) : null}
          {item.explanation !== null && item.explanation !== "" ? (
            <View
              style={{
                gap: 4,
                padding: 12,
                borderLeftWidth: 3,
                borderLeftColor: theme.accent,
                backgroundColor: colors.bgBase,
              }}
            >
              <Text variant="micro" style={{ color: theme.accent }}>
                {"// Explication"}
              </Text>
              <Text variant="bodySm" style={{ color: colors.textSecondary }}>
                {item.explanation}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

/**
 * The copy handed in: the score and its verdict, what to go back to first,
 * the answers right, wrong and blank; then the score of each module and the
 * correction, question by question.
 */
function ResultView({
  result,
  late,
  busy,
  error,
  onRestart,
  onBack,
}: {
  result: MockResult;
  late: boolean;
  busy: boolean;
  error: string | null;
  onRestart: () => void;
  onBack: () => void;
}): React.JSX.Element {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const tone = toneColor(result.score);
  const verdict = domainVerdict(result.score);
  const first = new Set(weakestDomains(result.domains).map((d) => d.domain));
  const counts = answerCounts(result.review);

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackButton label="Parcours" />
      </View>

      <View style={{ gap: 20 }}>
        <Rise index={0}>
          <View style={{ gap: 10 }}>
            <View style={{ alignSelf: "flex-start" }}>
              <Pill label={verdict} color={tone} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12 }}>
              <Text
                accessibilityLabel={`Score global : ${String(result.score)} %, ${verdict}`}
                style={{ fontFamily: `${fonts.sans}_800ExtraBold`, fontSize: 52, color: tone }}
              >
                {`${String(result.score)} %`}
              </Text>
              <Text variant="mono" style={{ color: colors.textMuted }}>
                Score global
              </Text>
            </View>
            <Text variant="h1">{mockAdvice(result.domains)}</Text>
            <Text variant="body">
              {`${String(result.correct)} ${plural(result.correct, "bonne")} ${plural(result.correct, "réponse")} sur ${String(result.total)}${late ? ", copie rendue après le temps imparti" : ""}.`}
            </Text>
          </View>
        </Rise>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <StatCell
            value={counts.right}
            label={plural(counts.right, "Juste")}
            accent={colors.success}
          />
          <StatCell
            value={counts.wrong}
            label={plural(counts.wrong, "Fausse")}
            accent={colors.danger}
          />
          <StatCell value={counts.blank} label="Sans réponse" accent={colors.textSecondary} />
        </View>

        <ResultActions busy={busy} error={error} announce onRestart={onRestart} onBack={onBack} />

        <View>
          <SectionLabel title="Score par module" />
          <View style={{ gap: 10 }}>
            {result.domains.map((domain) => (
              <DomainRow key={domain.domain} domain={domain} first={first.has(domain.domain)} />
            ))}
          </View>
        </View>

        <View>
          <SectionLabel
            title="Correction"
            right={
              <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
                {`${String(result.review.length)} ${plural(result.review.length, "question")}`}
              </Text>
            }
          />
          <View style={{ gap: 10 }}>
            {result.review.map((item) => {
              const isOpen = open[item.index] ?? !item.right;
              return (
                <ReviewRow
                  key={item.index}
                  item={item}
                  open={isOpen}
                  onToggle={() => {
                    setOpen((prev) => ({ ...prev, [item.index]: !isOpen }));
                  }}
                />
              );
            })}
          </View>
        </View>

        <ResultActions
          busy={busy}
          error={error}
          announce={false}
          onRestart={onRestart}
          onBack={onBack}
        />
      </View>
    </Screen>
  );
}
