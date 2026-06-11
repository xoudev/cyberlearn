"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import "../exam.css";
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
      if (r <= 0) void doSubmit(true);
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

  const passNeeded = Math.ceil((questionCount * passThreshold) / 100);
  const startDisabled =
    busy || !hasQuiz || !lessonsComplete || pathCompleted || cooldownUntilMs !== null;

  let statusNote: string | null = null;
  if (!hasQuiz) statusNote = "Aucun examen actif pour ce parcours.";
  else if (pathCompleted) statusNote = null;
  else if (!lessonsComplete)
    statusNote = "Termine toutes les leçons du parcours pour débloquer l'examen.";
  else if (cooldownUntilMs !== null)
    statusNote = "Examen déjà passé récemment : réessaie après le délai d'attente (48 h).";

  return (
    <div className="exam-root">
      <div className="exam-bg" aria-hidden="true">
        <div className="exam-bg__glow1" />
        <div className="exam-bg__glow2" />
        <div className="exam-bg__grid" />
      </div>

      <div className="exam-stage">
        <main className="exam-frame">
          <span className="bk tl" />
          <span className="bk tr" />
          <span className="bk bl" />
          <span className="bk br" />

          <div className="exam-bar">
            <span className="exam-bar__dots">
              <i />
              <i />
              <i />
            </span>
            <span className="exam-bar__path">
              $ ~/ cyberlearn / {pathSlug} / <b>examen-final</b>
            </span>
            <span className="exam-bar__status">
              <span className="dot" />
              Accès examen requis
            </span>
          </div>

          <div className="exam-body">
            {/* LEFT */}
            <section className="exam-left">
              <span className="exam-eyebrow">{"// Examen final"}</span>
              <h1 className="exam-title">{pathTitle}</h1>
              <div className="exam-refcode">
                {"// "}
                <b>{refCode}</b> · Certification vérifiable
              </div>

              <div className="exam-brief">
                <p>
                  {"Tu t'apprêtes à passer l'"}
                  <strong>examen certifiant</strong>
                  {
                    " du parcours. Il valide l'ensemble des compétences acquises au fil des missions."
                  }
                </p>
                <p>
                  {"Les questions sont "}
                  <span className="tq">tirées aléatoirement</span>
                  {" d'un pool, l'épreuve est "}
                  <strong>chronométrée</strong>
                  {", et tu disposes d'"}
                  <strong>une seule tentative</strong>
                  {". Une fois lancé, le chrono ne s'arrête plus."}
                </p>
              </div>

              <div className="exam-stats">
                <div className="exam-stat">
                  <span className="exam-stat__hex">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M7 8 a3 3 0 1 1 4 2.6 c-0.7 0.5-1 1-1 2" />
                      <circle cx="10" cy="15.5" r="0.6" fill="currentColor" stroke="none" />
                    </svg>
                  </span>
                  <div className="exam-stat__val">{questionCount}</div>
                  <div className="exam-stat__lbl">Questions</div>
                </div>
                <div className="exam-stat">
                  <span className="exam-stat__hex">{IcoClock}</span>
                  <div className="exam-stat__val">
                    {timeLimitMinutes}
                    <span className="u">:00</span>
                  </div>
                  <div className="exam-stat__lbl">Chronométré</div>
                </div>
                <div className="exam-stat exam-stat--pass">
                  <span className="exam-stat__hex">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="10" cy="10" r="6.5" />
                      <circle cx="10" cy="10" r="2.4" />
                    </svg>
                  </span>
                  <div className="exam-stat__val">
                    {passThreshold}
                    <span className="u">%</span>
                  </div>
                  <div className="exam-stat__lbl">Pour réussir</div>
                </div>
              </div>

              <div className="exam-cta-row">
                {pathCompleted ? (
                  <Link
                    className="exam-start"
                    href={certPublicId ? `/verify/${certPublicId}` : "/certifs"}
                  >
                    Voir mon certificat
                    {IcoArrowRight}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="exam-start"
                    onClick={onStart}
                    disabled={startDisabled}
                  >
                    <span className="exam-start__bk tl" />
                    <span className="exam-start__bk tr" />
                    <span className="exam-start__bk bl" />
                    <span className="exam-start__bk br" />
                    {busy ? "Préparation…" : "Commencer l'examen"}
                    {!busy && IcoArrowRight}
                  </button>
                )}
                <Link href={`/paths/${pathSlug}`} className="exam-back">
                  {IcoArrowLeft}
                  Retour au parcours
                </Link>
              </div>

              {statusNote && (
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "#FFB547",
                    marginTop: 16,
                  }}
                >
                  {statusNote}
                </p>
              )}
              {error && (
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "#FF4D6D",
                    marginTop: 12,
                  }}
                >
                  {error}
                </p>
              )}
            </section>

            {/* RIGHT */}
            <aside className="exam-right">
              <div className="exam-right__head">
                <span className="sl">{"//"}</span> {"Ce qui t'attend"}
              </div>

              <div className="rules">
                <div className="rule">
                  <span className="rule__ico">
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="14" height="14" rx="2.2" />
                      <circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" />
                      <circle cx="13" cy="7" r="1" fill="currentColor" stroke="none" />
                      <circle cx="10" cy="10" r="1" fill="currentColor" stroke="none" />
                      <circle cx="7" cy="13" r="1" fill="currentColor" stroke="none" />
                      <circle cx="13" cy="13" r="1" fill="currentColor" stroke="none" />
                    </svg>
                  </span>
                  <div className="rule__body">
                    <p className="rule__title">Questions tirées au sort</p>
                    <p className="rule__desc">
                      {`${String(questionCount)} questions piochées aléatoirement dans un pool. Chaque tentative est unique.`}
                    </p>
                  </div>
                </div>

                <div className="rule">
                  <span className="rule__ico">{IcoClock}</span>
                  <div className="rule__body">
                    <p className="rule__title">{`Chrono de ${String(timeLimitMinutes)} minutes`}</p>
                    <p className="rule__desc">
                      {
                        "Le temps défile en continu, sans pause possible. La copie est rendue à 0:00."
                      }
                    </p>
                  </div>
                </div>

                <div className="rule">
                  <span className="rule__ico">
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="10" cy="10" r="6.5" />
                      <circle cx="10" cy="10" r="2.4" />
                    </svg>
                  </span>
                  <div className="rule__body">
                    <p className="rule__title">{`Seuil de réussite : ${String(passThreshold)} %`}</p>
                    <p className="rule__desc">
                      {`Soit ${String(passNeeded)} bonnes réponses sur ${String(questionCount)} pour valider et débloquer le certificat.`}
                    </p>
                  </div>
                </div>

                <div className="rule rule--warn">
                  <span className="rule__ico">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="4.5" y="9" width="11" height="8" rx="1.4" />
                      <path d="M6.7 9 V6.5 A3.3 3.3 0 0 1 13.3 6.5 V9" />
                      <circle cx="10" cy="13" r="1" fill="currentColor" stroke="none" />
                    </svg>
                  </span>
                  <div className="rule__body">
                    <p className="rule__title">Une seule tentative</p>
                    <p className="rule__desc">
                      {"En cas d'échec, un "}
                      <b>cooldown de 48 h</b>
                      {" s'applique avant de pouvoir réessayer."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="exam-note">
                {IcoShield}
                <span>
                  <b>{"Charte d'honneur."}</b>
                  {" En commençant, tu certifies passer cet examen seul, sans aide extérieure."}
                </span>
              </div>
            </aside>
          </div>
        </main>
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
    onSelect,
    onGoto,
    onPrev,
    onNext,
    onFinish,
  } = props;
  const q = questions[index];
  const last = index === questionCount - 1;
  const low = remaining <= 5 * 60;
  const pct = questionCount > 0 ? ((index + 1) / questionCount) * 100 : 0;

  return (
    <div className="exam-root exam-root--fixed">
      <div className="exam-bg" aria-hidden="true">
        <div className="exam-bg__glow1" />
        <div className="exam-bg__grid" />
      </div>

      <div className="q-app">
        <header className="q-topbar">
          <div className="q-exam">
            <span className="q-exam__mark">{IcoShield}</span>
            <span className="q-exam__txt">
              <span className="q-exam__label">{"// Examen final"}</span>
              <span className="q-exam__name">{pathTitle}</span>
            </span>
          </div>

          <div className="q-progress">
            <div className="q-progress__count">
              Question <b>{pad2(index + 1)}</b> <span className="tot">/ {questionCount}</span>
            </div>
            <div className="q-progress__bar">
              <div className="q-progress__fill" style={{ width: `${String(pct)}%` }} />
            </div>
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
            </div>
          </div>
        </main>

        <nav className="q-nav">
          <button
            type="button"
            className="q-btn q-btn--ghost"
            onClick={onPrev}
            disabled={index === 0}
          >
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
            <button
              type="button"
              className="q-btn q-btn--finish"
              onClick={onFinish}
              disabled={busy}
            >
              {busy ? "Envoi…" : "Terminer l'examen"}
              {!busy && IcoCheck}
            </button>
          ) : (
            <button type="button" className="q-btn q-btn--next" onClick={onNext}>
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
}): React.JSX.Element {
  const { pathSlug, pathTitle, result, questions, timeUsed, passThreshold, certPublicId } = props;
  const passed = result.passed === true;
  const score = result.score ?? 0;
  const review = result.results ?? [];
  const okCount = review.filter((r) => r.correct).length;
  const noCount = review.length - okCount;
  const total = review.length;
  const delta = score - passThreshold;

  const qById = new Map(questions.map((q) => [q.id, q]));

  const [open, setOpen] = useState<Record<string, boolean>>({});

  // gauge geometry (matches the mockup: viewBox 200, r 86)
  const R = 86;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - score / 100);

  return (
    <div className="exam-root">
      <div className="exam-bg" aria-hidden="true">
        <div className="exam-bg__glow1" />
        <div className="exam-bg__grid" />
      </div>

      <div className={`r-app ${passed ? "is-pass" : "is-fail"}`}>
        <div className="r-wrap">
          <div className="r-crumb">
            <span className="p">$</span>
            <span>~/</span>
            <b>cyberlearn</b>
            <span className="slash">/</span>
            <span>{pathSlug}</span>
            <span className="slash">/</span>
            <span className="current">résultats</span>
          </div>

          <section className="r-hero">
            <div className="r-gauge">
              <svg viewBox="0 0 200 200">
                <circle className="r-gauge__track" cx="100" cy="100" r={R} />
                <circle
                  className="r-gauge__fill"
                  cx="100"
                  cy="100"
                  r={R}
                  strokeDasharray={C}
                  strokeDashoffset={offset}
                />
              </svg>
              <div className="r-gauge__center">
                <div className="r-gauge__pct">{score}%</div>
                <div className="r-gauge__sub">
                  {okCount} / {total} correctes
                </div>
              </div>
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
                <div className="r-compare__bar">
                  <div className="r-compare__fill" style={{ width: `${String(score)}%` }} />
                  <div className="r-compare__mark" style={{ left: `${String(passThreshold)}%` }} />
                </div>
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
                    href={certPublicId ? `/verify/${certPublicId}` : "/certifs"}
                  >
                    <span className="bk tl" />
                    <span className="bk tr" />
                    <span className="bk bl" />
                    <span className="bk br" />
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
                <>
                  <div className="r-action">
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
                      Réessayer après le cooldown
                    </button>
                    <Link className="r-btn r-btn--ghost" href={`/paths/${pathSlug}`}>
                      Revoir le parcours
                    </Link>
                  </div>
                  <div className="r-cooldown">
                    {IcoClock}
                    <span>
                      {"Une seule tentative par session. Nouvelle tentative possible après le "}
                      <b>{"délai d'attente de 48 h"}</b>
                      {" : révise les modules avant de réessayer."}
                    </span>
                  </div>
                </>
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
      <button type="button" className="r-q__head" onClick={onToggle}>
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
