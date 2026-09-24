import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { type NavigationAction, usePreventRemove } from "expo-router/react-navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { AppModal } from "@/components/app-modal";
import { ActionChip, BackButton, GradientButton } from "@/components/buttons";
import { CheckIcon, ClockIcon, CrossIcon } from "@/components/icons";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/states";
import { Card, SectionLabel, StatCell, Text, XPBar } from "@/components/ui";
import { startExamApi, submitExamApi } from "@/lib/api";
import { useCosmetics } from "@/lib/cosmetics";
import {
  correctNeeded,
  deadlineOf,
  finalStepOf,
  formatClock,
  optionVerdict,
  pad2,
  secondsUntil,
  secondsUsed,
  thresholdGap,
  unansweredCount,
  waitLabel,
  type ExamPath,
  type ExamQuestion,
  type ExamReviewItem,
  type ExamStatusDto,
  type FinalStep,
} from "@/lib/exam";
import { useExamStatus } from "@/lib/queries";
import { useSession } from "@/lib/session";

/**
 * A path's final exam: the site's /paths/[slug]/exam, on a phone. The rules,
 * the draw, the score and the certificate are the server's
 * (/api/mobile/exam/*); this screen shows them, keeps the time, and holds the
 * answers until the copy is handed in.
 */

type Phase =
  | { kind: "intro" }
  | { kind: "taking"; attemptId: string; questions: ExamQuestion[]; deadlineMs: number }
  | {
      kind: "results";
      questions: ExamQuestion[];
      score: number;
      passed: boolean;
      results: ExamReviewItem[];
      timeUsed: number;
    };

/** Below this, the clock turns red. */
const LOW_TIME_SECONDS = 5 * 60;

export default function ExamScreen(): React.JSX.Element {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { session } = useSession();
  const { data, error, refetch } = useExamStatus(session?.user.id, slug);

  // Only the first load has no data: a later refetch that fails keeps the
  // screen, and the exam in progress, where they are.
  if (!data) {
    return (
      <Screen>
        <View style={{ marginBottom: 16 }}>
          <BackButton label="Parcours" />
        </View>
        {error ? (
          <ErrorState onRetry={() => void refetch()} code="EXAM_LOAD" />
        ) : (
          <ListSkeleton rows={3} />
        )}
      </Screen>
    );
  }

  return (
    <ExamFlow
      path={data.path}
      status={data.status}
      onStatusStale={() => {
        void refetch();
      }}
    />
  );
}

function ExamFlow({
  path,
  status,
  onStatusStale,
}: {
  path: ExamPath;
  status: ExamStatusDto;
  onStatusStale: () => void;
}): React.JSX.Element {
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const limit = status.timeLimitMinutes;

  const [phase, setPhase] = useState<Phase>({ kind: "intro" });
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(limit * 60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [leaveAction, setLeaveAction] = useState<NavigationAction | null>(null);
  const submittingRef = useRef(false);
  const autoSentRef = useRef(false);
  const resumedRef = useRef(false);

  const step = finalStepOf(status);
  const taking = phase.kind === "taking" ? phase : null;

  const begin = useCallback(async (): Promise<void> => {
    // Once an attempt has been asked for, the status fetched again later (it
    // then shows that attempt running) must not start it over.
    resumedRef.current = true;
    setBusy(true);
    setError(null);
    const reply = await startExamApi(path.id);
    const receivedAt = Date.now();
    setBusy(false);
    if (!reply.ok) {
      setError(reply.error);
      // The refusal may come from a state this screen had not seen yet: an
      // attempt that ran out while away, the wait after it.
      onStatusStale();
      return;
    }
    const deadlineMs = deadlineOf(reply.secondsLeft, receivedAt);
    submittingRef.current = false;
    autoSentRef.current = false;
    setAnswers({});
    setIndex(0);
    setRemaining(secondsUntil(deadlineMs, receivedAt));
    setPhase({
      kind: "taking",
      attemptId: reply.attemptId,
      questions: reply.questions,
      deadlineMs,
    });
  }, [path.id, onStatusStale]);

  const submit = useCallback(async (): Promise<void> => {
    if (!taking || submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError(null);
    setConfirmFinish(false);
    const reply = await submitExamApi(taking.attemptId, answers);
    setBusy(false);
    if (!reply.ok) {
      submittingRef.current = false;
      setError(reply.error);
      return;
    }
    setPhase({
      kind: "results",
      questions: taking.questions,
      score: reply.score,
      passed: reply.passed,
      results: reply.results,
      timeUsed: secondsUsed(taking.deadlineMs, Date.now(), limit),
    });
    // The path, the profile's certificates, the XP: every cached read moves.
    void queryClient.invalidateQueries();
  }, [taking, answers, limit, queryClient]);

  // The countdown, against the deadline on this phone's clock. At 00:00 the
  // copy goes in once; if that fails, the button stays to send it again.
  useEffect(() => {
    if (!taking) return;
    const tick = (): void => {
      const left = secondsUntil(taking.deadlineMs, Date.now());
      setRemaining(left);
      if (left <= 0 && !autoSentRef.current) {
        autoSentRef.current = true;
        void submit();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      clearInterval(id);
    };
  }, [taking, submit]);

  // An attempt already running when the screen opens: back into it, as the
  // site does. Only then: begin() closes the door behind it.
  useEffect(() => {
    if (step.kind === "resume" && phase.kind === "intro" && !resumedRef.current) {
      void begin();
    }
  }, [step.kind, phase.kind, begin]);

  // Leaving mid-exam loses the answers (they are only sent at the end): ask.
  usePreventRemove(taking !== null && remaining > 0 && !busy, ({ data }) => {
    setLeaveAction(data.action);
  });

  const backToPath = (): void => {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: "/paths/[slug]", params: { slug: path.slug } });
  };

  const openCertificate = (publicId: string): void => {
    router.push({
      pathname: "/certificates/[publicId]",
      params: { publicId, title: path.title },
    });
  };

  if (taking) {
    const unanswered = unansweredCount(taking.questions, answers);
    return (
      <>
        <TakingView
          path={path}
          questions={taking.questions}
          index={index}
          answers={answers}
          remaining={remaining}
          busy={busy}
          error={error}
          onSelect={(questionId, optionId) => {
            setAnswers((a) => ({ ...a, [questionId]: optionId }));
          }}
          onGoto={setIndex}
          onFinish={() => {
            if (unanswered > 0) setConfirmFinish(true);
            else void submit();
          }}
        />
        <AppModal
          visible={confirmFinish}
          closeDisabled={busy}
          onClose={() => {
            setConfirmFinish(false);
          }}
        >
          <Text variant="h2">Rendre ta copie ?</Text>
          <Text variant="body">
            {unanswered === 1
              ? "Une question est encore sans réponse : elle comptera comme fausse."
              : `${String(unanswered)} questions sont encore sans réponse : elles compteront comme fausses.`}
          </Text>
          <GradientButton label="Rendre ma copie" loading={busy} onPress={() => void submit()} />
          <ActionChip
            label="Revenir aux questions"
            tone="neutral"
            disabled={busy}
            onPress={() => {
              setConfirmFinish(false);
            }}
          />
        </AppModal>
        <AppModal
          visible={leaveAction !== null}
          onClose={() => {
            setLeaveAction(null);
          }}
        >
          <Text variant="h2">Quitter l&apos;examen ?</Text>
          <Text variant="body">
            Le chrono continue sans toi. Tes réponses ne partent qu&apos;à la remise de la copie :
            en revenant avant 00:00, tu reprends la tentative sans elles. Passé ce délai, elle
            compte comme échouée.
          </Text>
          <GradientButton
            label="Continuer l'examen"
            onPress={() => {
              setLeaveAction(null);
            }}
          />
          <ActionChip
            label="Quitter quand même"
            tone="danger"
            onPress={() => {
              const action = leaveAction;
              setLeaveAction(null);
              if (action) navigation.dispatch(action);
            }}
          />
        </AppModal>
      </>
    );
  }

  if (phase.kind === "results") {
    return (
      <ResultsView
        path={path}
        passThreshold={status.passThreshold}
        certPublicId={status.certPublicId}
        result={phase}
        onOpenCertificate={openCertificate}
        onBack={backToPath}
      />
    );
  }

  return (
    <IntroView
      path={path}
      status={status}
      step={step}
      busy={busy}
      error={error}
      onStart={() => void begin()}
      onOpenCertificate={openCertificate}
      onBack={backToPath}
    />
  );
}

// ── Intro: the rules, and the one action the learner's state allows ──────────

function IntroView({
  path,
  status,
  step,
  busy,
  error,
  onStart,
  onOpenCertificate,
  onBack,
}: {
  path: ExamPath;
  status: ExamStatusDto;
  step: FinalStep;
  busy: boolean;
  error: string | null;
  onStart: () => void;
  onOpenCertificate: (publicId: string) => void;
  onBack: () => void;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const { questionCount, passThreshold, timeLimitMinutes } = status;
  const needed = correctNeeded(questionCount, passThreshold);

  let action: React.ReactNode;
  switch (step.kind) {
    case "ready":
      action = (
        <GradientButton
          label={busy ? "Préparation…" : "Commencer l'examen"}
          disabled={busy}
          onPress={onStart}
        />
      );
      break;
    case "resume":
      action = (
        <GradientButton
          label={busy ? "Reprise…" : "Reprendre l'examen"}
          disabled={busy}
          onPress={onStart}
        />
      );
      break;
    case "certified":
      action =
        step.publicId !== null ? (
          <GradientButton
            label="Voir mon certificat"
            onPress={() => {
              if (step.publicId !== null) onOpenCertificate(step.publicId);
            }}
          />
        ) : (
          <Note tone={colors.success}>Parcours validé : ton certificat est dans ton profil.</Note>
        );
      break;
    case "cooldown":
      action = (
        <Note tone={colors.warning}>
          {`Examen déjà passé récemment. Prochaine tentative possible ${waitLabel(step.until, Date.now())}.`}
        </Note>
      );
      break;
    case "locked":
      action = (
        <Note tone={colors.warning}>
          Termine toutes les leçons du parcours pour débloquer l&apos;examen.
        </Note>
      );
      break;
    case "claim":
      action = (
        <Note tone={colors.textSecondary}>
          Ce parcours n&apos;a pas d&apos;examen final : le certificat s&apos;obtient depuis la page
          du parcours.
        </Note>
      );
      break;
  }

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackButton label="Parcours" />
      </View>

      <View style={{ gap: 20 }}>
        <View>
          <Text variant="micro" style={{ color: theme.accent, marginBottom: 6 }}>
            {"// Examen final"}
          </Text>
          <Text variant="display" style={{ fontSize: 26 }}>
            {path.title}
          </Text>
          <Text variant="mono" style={{ marginTop: 6, fontSize: 11, color: colors.textMuted }}>
            {"// "}
            <Text style={{ color: colors.textSecondary }}>{path.refCode}</Text> · Certification
            vérifiable
          </Text>
          <Text variant="body" style={{ marginTop: 12 }}>
            Tu t&apos;apprêtes à passer l&apos;
            <Text style={{ color: colors.textPrimary }}>examen certifiant</Text> du parcours. Il
            valide l&apos;ensemble des compétences acquises au fil des missions.
          </Text>
          <Text variant="body" style={{ marginTop: 8 }}>
            Les questions sont tirées au hasard dans un pool, l&apos;épreuve est{" "}
            <Text style={{ color: colors.textPrimary }}>chronométrée</Text> et tu disposes d&apos;
            <Text style={{ color: colors.textPrimary }}>une seule tentative</Text>. Une fois lancé,
            le chrono ne s&apos;arrête plus.
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <StatCell value={questionCount} label="Questions" />
          <StatCell value={`${String(timeLimitMinutes)}:00`} label="Chronométré" />
          <StatCell
            value={`${String(passThreshold)} %`}
            label="Pour réussir"
            accent={theme.accent}
          />
        </View>

        <View style={{ gap: 10 }}>
          {action}
          {error !== null ? (
            <Text
              variant="bodySm"
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={{ color: colors.danger }}
            >
              {error}
            </Text>
          ) : null}
          {step.kind !== "ready" && step.kind !== "resume" ? (
            <View style={{ alignSelf: "flex-start" }}>
              <ActionChip label="Retour au parcours" tone="neutral" onPress={onBack} />
            </View>
          ) : null}
        </View>

        <Card style={{ gap: 14 }}>
          <Text variant="micro" style={{ color: theme.accent }}>
            {"// Ce qui t'attend"}
          </Text>
          <Rule
            title="Questions tirées au sort"
            body={`${String(questionCount)} questions piochées aléatoirement dans un pool. Chaque tentative est unique.`}
          />
          <Rule
            title={`Chrono de ${String(timeLimitMinutes)} minutes`}
            body="Le temps défile en continu, sans pause possible. La copie est rendue à 00:00."
          />
          <Rule
            title={`Seuil de réussite : ${String(passThreshold)} %`}
            body={`Soit ${String(needed)} bonnes réponses sur ${String(questionCount)} pour valider et débloquer le certificat.`}
          />
          <Rule
            title="Réponses envoyées à la fin"
            body="Rien ne part avant la remise de la copie : si tu quittes l'examen en cours, tu le reprends sans tes réponses."
          />
          <Rule
            title="Une seule tentative"
            body="En cas d'échec, un délai d'attente de 48 h s'applique avant de pouvoir réessayer."
            warn
          />
        </Card>

        <View
          style={{
            flexDirection: "row",
            gap: 10,
            padding: 12,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
          }}
        >
          <Text variant="bodySm" style={{ flex: 1 }}>
            <Text style={{ color: colors.textSecondary, fontFamily: `${fonts.sans}_600SemiBold` }}>
              Charte d&apos;honneur.
            </Text>{" "}
            En commençant, tu certifies passer cet examen seul, sans aide extérieure.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

function Rule({
  title,
  body,
  warn = false,
}: {
  title: string;
  body: string;
  warn?: boolean;
}): React.JSX.Element {
  return (
    <View
      style={{
        gap: 3,
        paddingLeft: 12,
        borderLeftWidth: 2,
        borderLeftColor: warn ? colors.warning : colors.borderDefault,
      }}
    >
      <Text variant="h3" style={warn ? { color: colors.warning } : undefined}>
        {title}
      </Text>
      <Text variant="bodySm">{body}</Text>
    </View>
  );
}

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

// ── Taking: one question at a time, the clock always in view ─────────────────

function TakingView({
  path,
  questions,
  index,
  answers,
  remaining,
  busy,
  error,
  onSelect,
  onGoto,
  onFinish,
}: {
  path: ExamPath;
  questions: ExamQuestion[];
  index: number;
  answers: Readonly<Record<string, string>>;
  remaining: number;
  busy: boolean;
  error: string | null;
  onSelect: (questionId: string, optionId: string) => void;
  onGoto: (index: number) => void;
  onFinish: () => void;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const question = questions[index];
  const total = questions.length;
  const last = index === total - 1;
  const low = remaining <= LOW_TIME_SECONDS;
  const clockColor = low ? colors.danger : theme.accent;

  return (
    <Screen scroll={false}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="micro" style={{ color: theme.accent }}>
            {"// Examen final"}
          </Text>
          <Text variant="h3" numberOfLines={1}>
            {path.title}
          </Text>
        </View>
        <View
          accessibilityRole="timer"
          accessibilityLabel={`Temps restant : ${formatClock(remaining)}`}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            minHeight: 40,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: clockColor,
            backgroundColor: low ? "rgba(255,77,109,0.08)" : "transparent",
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
            {formatClock(remaining)}
          </Text>
        </View>
      </View>

      <View style={{ gap: 6, marginBottom: 14 }}>
        <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
          Question <Text style={{ color: colors.textPrimary }}>{pad2(index + 1)}</Text> / {total}
        </Text>
        <XPBar current={index + 1} needed={Math.max(total, 1)} height={4} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {question ? (
          <>
            <Card accent={theme.accent} style={{ marginBottom: 14 }}>
              <Text variant="h2">{question.question}</Text>
            </Card>
            <View style={{ gap: 10 }} accessibilityRole="radiogroup">
              {question.options.map((option, i) => {
                const selected = answers[question.id] === option.id;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => {
                      onSelect(question.id, option.id);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      minHeight: 52,
                      padding: 14,
                      borderWidth: 1.5,
                      borderColor: selected ? theme.accent : colors.borderDefault,
                      backgroundColor: selected ? `${theme.accent}10` : colors.bgElevated,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text
                      variant="mono"
                      style={{ fontSize: 12, color: selected ? theme.accent : colors.textMuted }}
                    >
                      {String.fromCharCode(65 + i)}
                    </Text>
                    <Text variant="body" style={{ flex: 1, color: colors.textPrimary }}>
                      {option.text}
                    </Text>
                    {selected ? <CheckIcon color={theme.accent} size={16} strokeWidth={2} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginTop: 12 }}
        contentContainerStyle={{ gap: 6 }}
      >
        {questions.map((q, i) => {
          const answered = answers[q.id] !== undefined;
          const current = i === index;
          return (
            <Pressable
              key={q.id}
              accessibilityRole="button"
              accessibilityLabel={`Question ${String(i + 1)}${answered ? ", répondue" : ""}`}
              accessibilityState={{ selected: current }}
              onPress={() => {
                onGoto(i);
              }}
              style={{
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: current ? 2 : 1,
                borderColor: current
                  ? theme.accent
                  : answered
                    ? `${theme.accent}66`
                    : colors.borderDefault,
                backgroundColor: answered ? `${theme.accent}14` : "transparent",
              }}
            >
              <Text
                variant="mono"
                style={{
                  fontSize: 11,
                  color: current || answered ? theme.accent : colors.textMuted,
                }}
              >
                {pad2(i + 1)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {error !== null ? (
        <Text
          variant="bodySm"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{ color: colors.danger, marginTop: 10 }}
        >
          {error}
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 12 }}>
        <ActionChip
          label="Précédent"
          tone="neutral"
          disabled={index === 0}
          onPress={() => {
            onGoto(Math.max(0, index - 1));
          }}
        />
        {last || remaining <= 0 ? (
          <GradientButton
            label={busy ? "Envoi…" : "Terminer l'examen"}
            disabled={busy}
            onPress={onFinish}
            style={{ flex: 1 }}
          />
        ) : (
          <GradientButton
            label="Suivant"
            onPress={() => {
              onGoto(Math.min(total - 1, index + 1));
            }}
            style={{ flex: 1 }}
          />
        )}
      </View>
    </Screen>
  );
}

// ── Results: the score, what it means, and the correction ───────────────────

function ResultsView({
  path,
  passThreshold,
  certPublicId,
  result,
  onOpenCertificate,
  onBack,
}: {
  path: ExamPath;
  passThreshold: number;
  /** From the status fetched again after the pass: the new certificate's id. */
  certPublicId: string | null;
  result: Extract<Phase, { kind: "results" }>;
  onOpenCertificate: (publicId: string) => void;
  onBack: () => void;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const { passed, score, results, questions, timeUsed } = result;
  const tone = passed ? colors.success : colors.danger;
  const okCount = results.filter((r) => r.correct).length;
  const byId = new Map(questions.map((q) => [q.id, q]));
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <Screen>
      <View style={{ gap: 20 }}>
        <View style={{ gap: 10 }}>
          <View
            style={{
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: tone,
            }}
          >
            {passed ? (
              <CheckIcon color={tone} size={12} strokeWidth={2.4} />
            ) : (
              <CrossIcon color={tone} size={12} strokeWidth={2.4} />
            )}
            <Text variant="micro" style={{ color: tone }}>
              {passed ? "Réussi" : "Échoué"}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12 }}>
            <Text
              style={{ fontFamily: `${fonts.sans}_800ExtraBold`, fontSize: 52, color: tone }}
              accessibilityLabel={`Score : ${String(score)} %`}
            >
              {score} %
            </Text>
            <Text variant="mono" style={{ color: colors.textMuted }}>
              {okCount} / {results.length} correctes
            </Text>
          </View>
          <Text variant="h1">{passed ? "Examen validé." : "Seuil non atteint."}</Text>
          <Text variant="body">
            {passed
              ? `Bien joué, tu dépasses le seuil de réussite de ${String(passThreshold)} %. Le parcours est désormais certifié.`
              : `Il te manque ${String(passThreshold - score)} points pour valider. Le seuil de réussite est de ${String(passThreshold)} % : révise puis retente après le délai d'attente.`}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <StatCell value={okCount} label="Correctes" accent={colors.success} />
          <StatCell value={results.length - okCount} label="Incorrectes" accent={colors.danger} />
          <StatCell value={formatClock(timeUsed)} label="Temps utilisé" />
        </View>

        <View style={{ gap: 8 }}>
          <View
            style={{
              height: 8,
              borderWidth: 1,
              borderColor: colors.borderDefault,
              backgroundColor: "rgba(5,4,26,0.9)",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${Math.max(0, Math.min(100, score))}%`,
                backgroundColor: tone,
              }}
            />
            <View
              style={{
                position: "absolute",
                top: -4,
                bottom: -4,
                left: `${Math.max(0, Math.min(100, passThreshold))}%`,
                width: 2,
                backgroundColor: colors.textPrimary,
              }}
            />
          </View>
          <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
            Ton score · <Text style={{ color: tone }}>{thresholdGap(score, passThreshold)}</Text>
          </Text>
        </View>

        {passed ? (
          <View style={{ gap: 10 }}>
            <Card accent={colors.success}>
              <Text variant="bodySm" style={{ color: colors.textSecondary }}>
                <Text
                  style={{ color: colors.textPrimary, fontFamily: `${fonts.sans}_600SemiBold` }}
                >
                  Félicitations !
                </Text>{" "}
                Tu as validé l&apos;examen {path.title}. Ton certificat vérifiable a été ajouté à
                ton profil.
              </Text>
            </Card>
            {certPublicId !== null ? (
              <GradientButton
                label="Voir mon certificat"
                onPress={() => {
                  onOpenCertificate(certPublicId);
                }}
              />
            ) : null}
            <View style={{ alignSelf: "flex-start" }}>
              <ActionChip label="Retour au parcours" tone="neutral" onPress={onBack} />
            </View>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Note tone={colors.warning}>
              Une seule tentative à la fois : la prochaine est possible après un délai
              d&apos;attente de 48 h. Révise les missions avant de réessayer.
            </Note>
            <View style={{ alignSelf: "flex-start" }}>
              <ActionChip label="Revoir le parcours" tone="neutral" onPress={onBack} />
            </View>
          </View>
        )}

        <View>
          <SectionLabel
            eyebrow="Correction détaillée"
            title={`${String(results.length)} questions`}
          />
          <View style={{ gap: 10 }}>
            {results.map((item, i) => {
              const isOpen = open[item.questionId] ?? i === 0;
              return (
                <ReviewRow
                  key={item.questionId}
                  item={item}
                  index={i}
                  question={byId.get(item.questionId)}
                  open={isOpen}
                  accent={theme.accent}
                  onToggle={() => {
                    setOpen((o) => ({ ...o, [item.questionId]: !isOpen }));
                  }}
                />
              );
            })}
          </View>
        </View>
      </View>
    </Screen>
  );
}

function ReviewRow({
  item,
  index,
  question,
  open,
  accent,
  onToggle,
}: {
  item: ExamReviewItem;
  index: number;
  question: ExamQuestion | undefined;
  open: boolean;
  accent: string;
  onToggle: () => void;
}): React.JSX.Element {
  const tone = item.correct ? colors.success : colors.danger;
  return (
    <Card accent={tone} style={{ padding: 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 }}
      >
        <View style={{ paddingTop: 2 }}>
          {item.correct ? (
            <CheckIcon color={tone} size={15} strokeWidth={2.2} />
          ) : (
            <CrossIcon color={tone} size={15} strokeWidth={2.2} />
          )}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="micro" style={{ color: tone }}>
            Question {pad2(index + 1)} · {item.correct ? "Correcte" : "Incorrecte"}
          </Text>
          <Text variant="h3">{question?.question ?? "Question"}</Text>
        </View>
      </Pressable>
      {open ? (
        <View style={{ gap: 8, paddingHorizontal: 14, paddingBottom: 14 }}>
          {(question?.options ?? []).map((option, i) => {
            const verdict = optionVerdict(item, option.id);
            const color =
              verdict === "right"
                ? colors.success
                : verdict === "wrong"
                  ? colors.danger
                  : colors.textMuted;
            return (
              <View
                key={option.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: verdict === null ? colors.borderSubtle : color,
                }}
              >
                <Text variant="mono" style={{ fontSize: 11, color }}>
                  {String.fromCharCode(65 + i)}
                </Text>
                <Text variant="bodySm" style={{ flex: 1, color: colors.textPrimary }}>
                  {option.text}
                </Text>
                {verdict !== null ? (
                  <Text variant="micro" style={{ color }}>
                    {verdict === "right" ? "Bonne réponse" : "Ta réponse"}
                  </Text>
                ) : null}
              </View>
            );
          })}
          {item.selected === null ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                padding: 10,
                borderWidth: 1,
                borderColor: colors.danger,
              }}
            >
              <Text variant="bodySm" style={{ flex: 1, color: colors.textPrimary }}>
                Aucune réponse donnée
              </Text>
              <Text variant="micro" style={{ color: colors.danger }}>
                Ta réponse
              </Text>
            </View>
          ) : null}
          {item.explanation ? (
            <View
              style={{
                gap: 4,
                padding: 12,
                borderLeftWidth: 3,
                borderLeftColor: accent,
                backgroundColor: colors.bgBase,
              }}
            >
              <Text variant="micro" style={{ color: accent }}>
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
