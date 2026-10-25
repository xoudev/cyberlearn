"use client";

import { ProgressBar } from "@/components/progress-bar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import "../exam.css";
import { BastionLogo } from "@/components/bastion-logo";
import "@/components/assessment-workspace.css";
import { Crumb } from "@/components/crumb";
import { unlockDateLabel, waitLeftLabel } from "@/lib/exam/cooldown-label";
import {
  type StartQuizResult,
  type SubmitQuizResult,
  startQuizAttempt,
  submitQuizAttempt,
} from "../../_actions/quiz-actions";

type Question = NonNullable<StartQuizResult["questions"]>[number];
type ReviewItem = NonNullable<SubmitQuizResult["results"]>[number];

interface Props {
  pathId: string;
  pathSlug: string;
  pathTitle: string;
  refCode: string;
  hasQuiz: boolean;
  lessonsComplete: boolean;
  pathCompleted: boolean;
  certPublicId: string | null;
  questionCount: number;
  passThreshold: number;
  timeLimitMinutes: number;
  resumeStartedAtMs: number | null;
  cooldownUntilMs: number | null;
}

const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"];

function fmtClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// Once in the browser the value below never changes: nothing to subscribe to.
function subscribeNever(): () => void {
  return () => undefined;
}

/**
 * False on the server and while hydrating, true after. A date on the reader's
 * clock is written once this is true: the server knows neither their zone nor
 * when the page will be read.
 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

// ── Inline icons (reproduced from the mockups) ──────────────────────────────────
const IcoShield = (
  <svg
    width="13"
    height="13"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 2 L13 4 V8 C13 11 10.8 13 8 14 C5.2 13 3 11 3 8 V4 Z" />
  </svg>
);
const IcoArrowRight = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 8 H13 M9 4 L13 8 L9 12" />
  </svg>
);
const IcoArrowLeft = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M13 8 H3 M7 4 L3 8 L7 12" />
  </svg>
);
const IcoNext = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 8 H13 M9 4 L13 8 L9 12" />
  </svg>
);
const IcoCheck = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 8 L7 12 L13 4" />
  </svg>
);
const IcoClock = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="10" cy="11" r="6.4" />
    <path d="M10 8 V11 L12.2 12.6" />
    <path d="M7.7 3.5 H12.3" />
  </svg>
);

export function ExamFlow(props: Props): React.JSX.Element {
  const {
    pathId,
    pathSlug,
    pathTitle,
    refCode,
    hasQuiz,
    lessonsComplete,
    pathCompleted,
    certPublicId,
    questionCount,
    passThreshold,
    timeLimitMinutes,
    resumeStartedAtMs,
    cooldownUntilMs,
  } = props;

  const router = useRouter();
  const [phase, setPhase] = useState<"intro" | "taking" | "results">("intro");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitQuizResult | null>(null);
  const [timeUsed, setTimeUsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(timeLimitMinutes * 60);
  const submittingRef = useRef(false);
  // The hand-in at zero is tried once: if it fails, "Terminer l'examen" stays to
  // try again, rather than a request and a refresh every second until the rate
  // limit refuses (the mock exam guards it the same way).
  const autoSentRef = useRef(false);
  const resumedRef = useRef(false);

  const doSubmit = useCallback(
    async (auto: boolean) => {
      if (!attemptId || submittingRef.current) return;
      submittingRef.current = true;
      setBusy(true);
      setError(null);
      const usedSeconds =
        deadlineMs === null
          ? timeLimitMinutes * 60
          : Math.min(
              timeLimitMinutes * 60,
              Math.max(0, timeLimitMinutes * 60 - Math.ceil((deadlineMs - Date.now()) / 1000)),
            );
      const res = await submitQuizAttempt(attemptId, answers);
      setBusy(false);
      if (!res.ok) {
        submittingRef.current = false;
        setError(res.error ?? "Soumission impossible.");
        if (auto) router.refresh();
        return;
      }
      setTimeUsed(usedSeconds);
      setResult(res);
      setPhase("results");
      setDeadlineMs(null);
      if (res.passed) router.refresh();
    },
    [attemptId, answers, deadlineMs, timeLimitMinutes, router],
  );

  // Countdown, anchored to the server startedAt (via deadlineMs). Auto-submits at 0.
  useEffect(() => {
    if (phase !== "taking" || deadlineMs === null) return;
    const tick = () => {
      const r = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
      setRemaining(r);
      if (r <= 0 && !autoSentRef.current) {
        autoSentRef.current = true;
        void doSubmit(true);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      clearInterval(id);
    };
  }, [phase, deadlineMs, doSubmit]);

  const begin = useCallback(
    (anchorMs: number) => {
      setBusy(true);
      setError(null);
      // A copy handed in leaves the guards up; the next attempt starts without them.
      submittingRef.current = false;
      autoSentRef.current = false;
      void (async () => {
        const res = await startQuizAttempt(pathId);
        setBusy(false);
        if (!res.ok || !res.attemptId || !res.questions) {
          setError(res.error ?? "Impossible de démarrer l'examen.");
          return;
        }
        setAttemptId(res.attemptId);
        setQuestions(res.questions);
        setIndex(0);
        setAnswers({});
        setDeadlineMs(anchorMs + timeLimitMinutes * 60_000);
        setPhase("taking");
      })();
    },
    [pathId, timeLimitMinutes],
  );

  // Resume an in-progress attempt on mount (countdown continues from server time).
  useEffect(() => {
    if (resumeStartedAtMs !== null && !resumedRef.current) {
      resumedRef.current = true;
      begin(resumeStartedAtMs);
    }
  }, [resumeStartedAtMs, begin]);

  if (phase === "taking") {
    return (
      <TakingScreen
        pathTitle={pathTitle}
        questionCount={questions.length}
        index={index}
        questions={questions}
        answers={answers}
        remaining={remaining}
        busy={busy}
        error={error}
        timeLimitMinutes={timeLimitMinutes}
        onSelect={(qid, oid) => {
          setAnswers((a) => ({ ...a, [qid]: oid }));
        }}
        onGoto={(i) => {
          setIndex(i);
        }}
        onPrev={() => {
          setIndex((i) => Math.max(0, i - 1));
        }}
        onNext={() => {
          setIndex((i) => Math.min(questions.length - 1, i + 1));
        }}
        onFinish={() => {
          void doSubmit(false);
        }}
      />
    );
  }

  if (phase === "results" && result) {
    return (
      <ResultsScreen
        pathSlug={pathSlug}
        pathTitle={pathTitle}
        result={result}
        questions={questions}
        timeUsed={timeUsed}
        passThreshold={passThreshold}
        certPublicId={certPublicId}
        onRetry={() => {
          // Back to the rules, read again from the server: the page's own
          // cooldown dates from when it loaded, before this attempt.
          setResult(null);
          setPhase("intro");
          router.refresh();
        }}
      />
    );
  }

  return (
    <IntroScreen
      pathSlug={pathSlug}
      pathTitle={pathTitle}
      refCode={refCode}
      hasQuiz={hasQuiz}
      lessonsComplete={lessonsComplete}
      pathCompleted={pathCompleted}
      certPublicId={certPublicId}
      questionCount={questionCount}
      passThreshold={passThreshold}
      timeLimitMinutes={timeLimitMinutes}
      cooldownUntilMs={cooldownUntilMs}
      busy={busy}
      error={error}
      onStart={() => {
        begin(Date.now());
      }}
    />
  );
}

// ── INTRO ───────────────────────────────────────────────────────────────────────
function IntroScreen(props: {
  pathSlug: string;
  pathTitle: string;
  refCode: string;
  hasQuiz: boolean;
  lessonsComplete: boolean;
  pathCompleted: boolean;
  certPublicId: string | null;
  questionCount: number;
  passThreshold: number;
  timeLimitMinutes: number;
  cooldownUntilMs: number | null;
  busy: boolean;
  error: string | null;
  onStart: () => void;
}): React.JSX.Element {
  const {
    pathSlug,
    pathTitle,
    refCode,
    hasQuiz,
    lessonsComplete,
    pathCompleted,
    certPublicId,
    questionCount,
    passThreshold,
    timeLimitMinutes,
    cooldownUntilMs,
    busy,
    error,
    onStart,
  } = props;

  const hydrated = useHydrated();
  const passNeeded = Math.ceil((questionCount * passThreshold) / 100);
  const startDisabled =
    busy || !hasQuiz || !lessonsComplete || pathCompleted || cooldownUntilMs !== null;

  let statusNote: string | null = null;
  if (!hasQuiz) statusNote = "Aucun examen actif pour ce parcours.";
  else if (pathCompleted) statusNote = null;
  else if (!lessonsComplete)
    statusNote = "Termine toutes les leçons du parcours pour débloquer l'examen.";
  // When the wait ends, as the result screen says it. The date is on the
  // reader's clock, so the server writes the fixed line and the browser the date.
  else if (cooldownUntilMs !== null)
    statusNote = hydrated
      ? `Examen déjà passé récemment : nouvelle tentative possible le ${unlockDateLabel(cooldownUntilMs)}.`
      : "Examen déjà passé récemment : réessaie après le délai d'attente (48 h).";

  return (
    <div className="exam-root learning-catalogue learning-workspace assessment-workspace">
      <div className="exam-stage">
        <div className="exam-frame">
          <header className="assessment-brand">
            <BastionLogo size={36} />
            <span>CyberLearn / Examen final</span>
            <span className="assessment-brand__reference">{refCode}</span>
          </header>
          <div className="exam-body">
            <section className="exam-left">
              <p className="exam-eyebrow">Valider tes acquis</p>
              <h1 className="exam-title">
                {pathTitle}
                <span>.</span>
              </h1>
              <p className="exam-brief">
                Une épreuve chronométrée pour valider le parcours et obtenir ton certificat
                vérifiable. Lis les conditions avant de commencer.
              </p>
              <div className="exam-departure">
                <dl className="exam-stats">
                  <div className="exam-stat">
                    <dt>Questions</dt>
                    <dd>{questionCount}</dd>
                  </div>
                  <div className="exam-stat">
                    <dt>Minutes</dt>
                    <dd>{timeLimitMinutes}</dd>
                  </div>
                  <div className="exam-stat">
                    <dt>Pour réussir</dt>
                    <dd>
                      {passThreshold}
                      <span> %</span>
                    </dd>
                  </div>
                </dl>
                <div className="exam-cta-row">
                  {pathCompleted ? (
                    <Link
                      className="exam-start"
                      href={certPublicId ? `/verify/${certPublicId}` : "/certificates"}
                    >
                      Voir mon certificat {IcoArrowRight}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="exam-start"
                      onClick={onStart}
                      disabled={startDisabled}
                    >
                      {busy ? "Préparation…" : "Commencer l'examen"}
                      {!busy && IcoArrowRight}
                    </button>
                  )}
                  <Link href={`/paths/${pathSlug}`} className="exam-back">
                    Retour au parcours
                  </Link>
                </div>
                {statusNote && (
                  <p className="assessment-notice" role="status">
                    {statusNote}
                  </p>
                )}
                {error && (
                  <p className="assessment-error" role="alert">
                    {error}
                  </p>
                )}
              </div>
            </section>
            <aside className="exam-right">
              <h2>Avant de te lancer.</h2>
              <ol className="assessment-rules">
                <li>
                  <h3>Des questions tirées au sort</h3>
                  <p>
                    {hasQuiz
                      ? `${String(questionCount)} questions choisies dans le questionnaire du parcours. Une seule réponse par question.`
                      : "Le questionnaire de ce parcours n’est pas encore disponible."}
                  </p>
                </li>
                <li>
                  <h3>Un chrono sans pause</h3>
                  <p>
                    {timeLimitMinutes} minutes dès le lancement. À zéro, ta copie est rendue
                    automatiquement.
                  </p>
                </li>
                <li>
                  <h3>Un seuil à atteindre</h3>
                  <p>
                    {hasQuiz
                      ? `${String(passNeeded)} bonnes réponses sur ${String(questionCount)} pour atteindre ${String(passThreshold)} % et valider l’examen.`
                      : "Le seuil de réussite s’appliquera quand le questionnaire sera disponible."}
                  </p>
                </li>
                <li>
                  <h3>Une tentative à la fois</h3>
                  <p>En cas d’échec, un délai de 48 h s’applique avant de pouvoir réessayer.</p>
                </li>
              </ol>
              <p className="exam-note">
                {IcoShield}
                <span>
                  <b>Charte d’honneur.</b> En commençant, tu certifies passer cet examen seul, sans
                  aide extérieure.
                </span>
              </p>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TAKING ────────────────────────────────────────────────────────────────────
function TakingScreen(props: {
  pathTitle: string;
  questionCount: number;
  index: number;
  questions: Question[];
  answers: Record<string, string>;
  remaining: number;
  busy: boolean;
  error: string | null;
  timeLimitMinutes: number;
  onSelect: (qid: string, oid: string) => void;
  onGoto: (i: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
}): React.JSX.Element {
  const {
    pathTitle,
    questionCount,
    index,
    questions,
    answers,
    remaining,
    busy,
    error,
    onSelect,
    onGoto,
    onPrev,
    onNext,
    onFinish,
  } = props;
  const q = questions[index];
  // Once time is up the copy can be handed in from any question: the one
  // sent at zero may have failed, and this is the way to send it again.
  const last = index === questionCount - 1 || remaining <= 0;
  const low = remaining <= 5 * 60;
  const pct = questionCount > 0 ? ((index + 1) / questionCount) * 100 : 0;

  return (
    <div className="exam-root exam-root--fixed learning-catalogue learning-workspace assessment-workspace">
      <div className="q-app">
        <header className="q-topbar">
          <div className="q-exam">
            <span className="q-exam__mark">
              <BastionLogo size={32} />
            </span>
            <span className="q-exam__txt">
              <span className="q-exam__label">{"// Examen final"}</span>
              <span className="q-exam__name">{pathTitle}</span>
            </span>
          </div>

          <div className="q-progress">
            <div className="q-progress__count">
              Question <b>{pad2(index + 1)}</b> <span className="tot">/ {questionCount}</span>
            </div>
            <ProgressBar
              value={pct}
              animated
              className="q-progress__bar"
              label={`Question ${String(index + 1)} sur ${String(questionCount)}`}
            />
          </div>

          <div className={`q-timer${low ? " is-low" : ""}`}>
            <span className="q-timer__ico">{IcoClock}</span>
            <span className="q-timer__val">{fmtClock(remaining)}</span>
          </div>
        </header>

        <main className="q-main">
          <div className="q-stage">
            <div className="q-card">
              <div className="q-eyebrow">
                {"// Question "}
                {pad2(index + 1)} <span className="pts">· {questionCount} au total</span>
              </div>
              <h1 className="q-text">{q?.question}</h1>
              <div className="q-options">
                {q?.options.map((o, i) => {
                  const selected = answers[q.id] === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      className={`q-opt${selected ? " is-selected" : ""}`}
                      aria-pressed={selected}
                      onClick={() => {
                        onSelect(q.id, o.id);
                      }}
                    >
                      <span className="q-opt__key">
                        <span>{OPTION_KEYS[i] ?? String(i + 1)}</span>
                      </span>
                      <span className="q-opt__text">{o.text}</span>
                      <span className="q-opt__check">{IcoCheck}</span>
                    </button>
                  );
                })}
              </div>
              {/* A copy refused or lost on the way used to say nothing here. */}
              {error && (
                <p
                  role="alert"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--color-danger)",
                    marginTop: 12,
                  }}
                >
                  {error}
                </p>
              )}
            </div>
          </div>
        </main>

        <nav className="q-nav">
          <button type="button" className="btn btn--ghost" onClick={onPrev} disabled={index === 0}>
            {IcoArrowLeft}
            Précédent
          </button>

          <div className="q-dots">
            {questions.map((qq, i) => {
              const answered = answers[qq.id] != null;
              const cls = `q-dot${answered ? " is-answered" : ""}${i === index ? " is-current" : ""}`;
              return (
                <button
                  key={qq.id}
                  type="button"
                  className={cls}
                  title={`Question ${pad2(i + 1)}`}
                  onClick={() => {
                    onGoto(i);
                  }}
                >
                  <span>{pad2(i + 1)}</span>
                </button>
              );
            })}
          </div>

          {last ? (
            <button type="button" className="btn btn--accent" onClick={onFinish} disabled={busy}>
              {busy ? "Envoi…" : "Terminer l'examen"}
              {!busy && IcoCheck}
            </button>
          ) : (
            <button type="button" className="btn btn--ghost" onClick={onNext}>
              Suivant
              {IcoNext}
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}

// ── RESULTS ───────────────────────────────────────────────────────────────────
function ResultsScreen(props: {
  pathSlug: string;
  pathTitle: string;
  result: SubmitQuizResult;
  questions: Question[];
  timeUsed: number;
  passThreshold: number;
  certPublicId: string | null;
  onRetry: () => void;
}): React.JSX.Element {
  const { pathSlug, pathTitle, result, questions, timeUsed, passThreshold, certPublicId, onRetry } =
    props;
  const passed = result.passed === true;
  const score = result.score ?? 0;
  const review = result.results ?? [];
  const okCount = review.filter((r) => r.correct).length;
  const noCount = review.length - okCount;
  const total = review.length;
  const delta = score - passThreshold;

  const qById = new Map(questions.map((q) => [q.id, q]));

  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <div className="exam-root learning-catalogue learning-workspace assessment-workspace">
      <div className={`r-app ${passed ? "is-pass" : "is-fail"}`}>
        <div className="r-wrap">
          <Crumb segments={[pathSlug, "résultats"]} caret={false} />

          <section className="r-hero">
            <div className="assessment-score" aria-label="Score de l’examen">
              <span>Ton résultat</span>
              <strong>
                {score}
                <span> %</span>
              </strong>
              <p>
                {okCount} / {total} réponses correctes
              </p>
              <span>Seuil de réussite : {passThreshold} %</span>
            </div>

            <div className="r-status">
              <span className="r-status__badge">
                <span className="ico">
                  {passed ? (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 8 L7 12 L13 4" />
                    </svg>
                  ) : (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 4 L12 12 M12 4 L4 12" />
                    </svg>
                  )}
                </span>
                {passed ? "Réussi" : "Échoué"}
              </span>

              <h1 className="r-status__title">
                {passed ? "Examen validé." : "Seuil non atteint."}
              </h1>
              <p className="r-status__desc">
                {passed ? (
                  <>
                    {"Bien joué, tu dépasses le seuil de réussite de "}
                    <b>{passThreshold} %</b>
                    {". Le parcours est désormais "}
                    <span className="ac">certifié</span>.
                  </>
                ) : (
                  <>
                    {`Il te manque ${String(Math.abs(delta))} points pour valider. Le seuil de réussite est de `}
                    <span className="ac">{passThreshold} %</span>
                    {" : révise puis retente après le délai d'attente."}
                  </>
                )}
              </p>

              <div className="r-substats">
                <div className="r-substats__cell">
                  <div className="r-substats__val ok">{okCount}</div>
                  <div className="r-substats__lbl">Correctes</div>
                </div>
                <div className="r-substats__cell">
                  <div className="r-substats__val no">{noCount}</div>
                  <div className="r-substats__lbl">Incorrectes</div>
                </div>
                <div className="r-substats__cell">
                  <div className="r-substats__val">{fmtClock(timeUsed)}</div>
                  <div className="r-substats__lbl">Temps utilisé</div>
                </div>
              </div>

              <div className="r-compare">
                <span className="r-compare__txt">Ton score</span>
                <ProgressBar
                  value={score}
                  size="lg"
                  marker={passThreshold}
                  className="r-compare__bar"
                  label={`Ton score, ${String(score)} sur 100, seuil à ${String(passThreshold)}`}
                />
                <span className="r-compare__txt">
                  <b>
                    {delta >= 0 ? "+" : "−"}
                    {Math.abs(delta)} pts
                  </b>{" "}
                  {delta >= 0 ? "au-dessus du seuil" : "sous le seuil"}
                </span>
              </div>

              {passed ? (
                <div className="r-action">
                  <Link
                    className="r-btn r-btn--cert"
                    href={certPublicId ? `/verify/${certPublicId}` : "/certificates"}
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="10" cy="8" r="4" />
                      <path d="M7 11.5 L6 17 L10 15 L14 17 L13 11.5" />
                    </svg>
                    Voir mon certificat
                  </Link>
                  <Link className="r-btn r-btn--ghost" href={`/paths/${pathSlug}`}>
                    Retour au parcours
                  </Link>
                </div>
              ) : (
                <RetryAfterWait
                  untilMs={result.cooldownUntil?.getTime() ?? null}
                  pathSlug={pathSlug}
                  onRetry={onRetry}
                />
              )}
            </div>
          </section>

          {passed && (
            <div className="r-congrats">
              <span className="r-congrats__ico">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="10" cy="8" r="4" />
                  <path d="M7 11.5 L6 17 L10 15 L14 17 L13 11.5" />
                </svg>
              </span>
              <span className="r-congrats__txt">
                <b>Félicitations !</b>
                {` Tu as validé l'examen `}
                <b>{pathTitle}</b>
                {". Ton certificat vérifiable a été ajouté à ton profil."}
              </span>
            </div>
          )}

          <section className="r-review">
            <div className="r-review__head">
              <span className="r-review__title">{"// Correction détaillée"}</span>
              <div className="r-review__legend">
                <span>
                  <i className="ok" />
                  Correcte
                </span>
                <span>
                  <i className="no" />
                  Incorrecte
                </span>
              </div>
            </div>

            {review.map((r, idx) => (
              <ReviewRow
                key={r.questionId}
                item={r}
                index={idx}
                question={qById.get(r.questionId)}
                open={open[r.questionId] ?? idx === 0}
                onToggle={() => {
                  setOpen((o) => ({ ...o, [r.questionId]: !(o[r.questionId] ?? idx === 0) }));
                }}
              />
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * After a fail: the next attempt, locked until the wait is over and counting
 * down to it, then open. It used to be a button disabled for good, whatever
 * the time. Rendered only after a copy is handed in, never on the server, so
 * reading the clock here cannot upset hydration.
 */
export function RetryAfterWait(props: {
  /** From the server's answer to the copy. Null when it gave none: nothing to wait for here. */
  untilMs: number | null;
  pathSlug: string;
  onRetry: () => void;
}): React.JSX.Element {
  const { untilMs, pathSlug, onRetry } = props;
  const [nowMs, setNowMs] = useState(() => Date.now());
  const waiting = untilMs !== null && untilMs > nowMs;

  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [waiting]);

  return (
    <>
      <div className="r-action">
        {waiting ? (
          <button type="button" className="r-btn r-btn--retry" disabled>
            <span className="lock">
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3.5" y="7" width="9" height="6.5" rx="1" />
                <path d="M5.2 7 V5 C5.2 3.4 6.4 2.2 8 2.2 C9.6 2.2 10.8 3.4 10.8 5 V7" />
              </svg>
            </span>
            Réessayer dans {waitLeftLabel(untilMs - nowMs)}
          </button>
        ) : (
          <button type="button" className="r-btn r-btn--cert" onClick={onRetry}>
            Réessayer l&apos;examen
          </button>
        )}
        <Link className="r-btn r-btn--ghost" href={`/paths/${pathSlug}`}>
          Revoir le parcours
        </Link>
      </div>
      {waiting && (
        <div className="r-cooldown">
          {IcoClock}
          <span>
            {"Une seule tentative à la fois. Nouvelle tentative possible le "}
            <b>{unlockDateLabel(untilMs)}</b>
            {" : révise les modules avant de réessayer."}
          </span>
        </div>
      )}
    </>
  );
}

function ReviewRow(props: {
  item: ReviewItem;
  index: number;
  question: Question | undefined;
  open: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  const { item, index, question, open, onToggle } = props;
  const wrong = !item.correct;

  return (
    <div className={`r-q${wrong ? " is-wrong" : ""}${open ? " is-open" : ""}`}>
      <button type="button" className="r-q__head" onClick={onToggle} aria-expanded={open}>
        <span className="r-q__mark">
          {wrong ? (
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4 L12 12 M12 4 L4 12" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 8 L7 12 L13 4" />
            </svg>
          )}
        </span>
        <span>
          <span className="r-q__num">
            Question {pad2(index + 1)} · {wrong ? "Incorrecte" : "Correcte"}
          </span>
          <span className="r-q__q">{question?.question ?? "Question"}</span>
        </span>
        <span className="r-q__chev">
          <svg
            width="15"
            height="15"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 3 L11 8 L6 13" />
          </svg>
        </span>
      </button>

      <div className="r-q__body">
        <div className="r-q__answers">
          {(question?.options ?? []).map((o, i) => {
            const isSelected = item.selected === o.id;
            // The correct option id is intentionally not sent to the client; we can
            // only attest the learner's own pick (right → green, wrong → red).
            let cls = "";
            let tag: string | null = null;
            if (isSelected && item.correct) {
              cls = "r-ans--correct";
              tag = "Bonne réponse";
            } else if (isSelected && wrong) {
              cls = "r-ans--chosen-wrong";
              tag = "Ta réponse";
            }
            return (
              <div key={o.id} className={`r-ans ${cls}`}>
                <span className="r-ans__key">{OPTION_KEYS[i] ?? String(i + 1)}</span>
                <span className="r-ans__text">{o.text}</span>
                {tag && <span className="r-ans__tag">{tag}</span>}
              </div>
            );
          })}
          {item.selected === null && (
            <div className="r-ans r-ans--chosen-wrong">
              <span className="r-ans__key">-</span>
              <span className="r-ans__text">Aucune réponse donnée</span>
              <span className="r-ans__tag">Ta réponse</span>
            </div>
          )}
        </div>

        {item.explanation != null && item.explanation !== "" && (
          <div className="r-explain">
            <span className="r-explain__ico">
              <svg
                width="16"
                height="16"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="9" r="7" />
                <path d="M9 8 V13 M9 5.5 V5.6" />
              </svg>
            </span>
            <div className="r-explain__txt">
              <span className="lbl">{"// Explication"}</span>
              {item.explanation}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
