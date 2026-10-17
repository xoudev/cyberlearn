"use client";

// "use client" justification: the flow keeps the clock and the answers in the
// browser between the start and the hand-in; the draw and the score are the
// server's (../_actions/mock-exam-actions.ts).

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ANSWER_WORD,
  answerCounts,
  answerState,
  domainVerdict,
  MOCK_LAST_MINUTE_MS,
  mockAdvice,
  mockClock,
  mockParts,
  optionKey,
  optionTag,
  unansweredQuestions,
  verdictTone,
  weakestDomains,
  type MockAnswerState,
  type MockPart,
  type MockQuestion,
  type MockResult,
  type MockReviewItem,
} from "@cyberlearn/lib/exam/mock";
import { Brackets } from "@/app/_components/corner-brackets";
import { ProgressBar } from "@/components/progress-bar";
import { StickyRail } from "@/components/sticky-rail";
import { addressWith } from "@/hooks/use-query-dialog";
import type { MockOverview } from "@/lib/exam/mock-exam";
import { startMockExamAction, submitMockExamAction } from "../_actions/mock-exam-actions";
import { MOCK_GO, mockWindowHref } from "./mock-address";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconChevron,
  IconClock,
  IconCross,
  IconDash,
  IconInfo,
  IconPaper,
  plural,
} from "./mock-exam-bits";
import "./mock-exam.css";

type Stage =
  | { kind: "opening" }
  | {
      kind: "running";
      attemptId: string;
      deadline: number;
      questions: MockQuestion[];
    }
  | { kind: "result"; result: MockResult; late: boolean };

/**
 * A verdict's colour (mock-exam.css, data-tone); "none" is a question left
 * blank, kept neutral so that amber only ever means "à consolider".
 */
type Tone = "ok" | "mid" | "low" | "none";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Whether the address carries ?go=1, the window's "Commencer". */
function startedByWindow(): boolean {
  return new URLSearchParams(window.location.search).has(MOCK_GO);
}

/**
 * Takes ?go=1 off the address once the exam is under way: a reload, or the
 * address bookmarked or shared, lands on the window on the path's page
 * (next.config.ts redirects a page load without it) rather than drawing
 * another paper. Through the History API, which Next follows without a
 * request; the hand-in then posts to the address without it, which the
 * redirect leaves alone.
 */
function leaveGo(): void {
  if (!startedByWindow()) return;
  window.history.replaceState(null, "", addressWith(window.location.href, MOCK_GO, null));
}

// ── Opening ───────────────────────────────────────────────────────────────

/**
 * Between the window's "Commencer" and the paper: the paper being drawn (or
 * the attempt still running taken up again), or why it could not be, with
 * the way to try again and the way back. Or, for a page brought back without
 * ?go=1, the way to the window while the router takes the reader there.
 */
function Opening({
  overview,
  busy,
  error,
  leaving,
  onRetry,
}: {
  overview: MockOverview;
  busy: boolean;
  error: string | null;
  leaving: boolean;
  onRetry: () => void;
}): React.ReactElement {
  return (
    <section className="mkx-open" aria-label="Examen blanc">
      <Brackets />
      <p className="mkx-eyebrow">{"// Examen blanc"}</p>
      <h1 className="pg-title">{overview.pathTitle}</h1>
      {!overview.ready ? (
        <p className="mkx-note">
          Ce parcours n&apos;a pas encore assez de questions pour un examen blanc.
        </p>
      ) : error !== null ? (
        <p role="alert" className="mkx-error">
          {error}
        </p>
      ) : (
        <p className="mkx-open__wait" role="status">
          <span className="mkx-live__dot" aria-hidden="true" />
          {leaving ? "Retour à la présentation de l'examen…" : "Préparation de ta copie…"}
        </p>
      )}
      <div className="mkx-cta">
        {overview.ready && error !== null ? (
          <button
            type="button"
            className="btn btn--accent btn--lg mkx-start"
            onClick={onRetry}
            disabled={busy}
          >
            Réessayer
            <IconArrowRight />
          </button>
        ) : null}
        <Link href={`/paths/${overview.pathSlug}`} className="mkx-back">
          <IconArrowLeft />
          Retour au parcours
        </Link>
      </div>
    </section>
  );
}

// ── Running ───────────────────────────────────────────────────────────────

/** One question: its number and whether it has an answer, then its options as keyed rows. */
function QuestionCard({
  question,
  picked,
  onPick,
}: {
  question: MockQuestion;
  picked: number | undefined;
  onPick: (k: number) => void;
}): React.ReactElement {
  const textId = `mock-${String(question.index)}-text`;
  const answered = picked !== undefined;
  return (
    <div
      id={`mkx-q-${String(question.index)}`}
      className="mkx-q"
      data-answered={answered ? "true" : "false"}
    >
      <div className="mkx-q__head">
        <span>
          Question <b>{pad2(question.index + 1)}</b>
        </span>
        <span className="mkx-q__state">{answered ? "Répondue" : "Sans réponse"}</span>
      </div>
      <h3 id={textId} className="mkx-q__text">
        {question.question}
      </h3>
      <div className="mkx-opts" role="radiogroup" aria-labelledby={textId}>
        {question.options.map((option, k) => {
          const id = `mock-${String(question.index)}-${String(k)}`;
          return (
            <div key={id} className="mkx-opt">
              <input
                id={id}
                className="mkx-opt__input"
                type="radio"
                name={`mock-${String(question.index)}`}
                checked={picked === k}
                onChange={() => {
                  onPick(k);
                }}
              />
              <label htmlFor={id} className="mkx-opt__label">
                <span className="mkx-opt__key mkx-hex" aria-hidden="true">
                  <span data-key={optionKey(k)} />
                </span>
                <span className="mkx-opt__text">{option}</span>
                <span className="mkx-opt__check" aria-hidden="true">
                  <IconCheck />
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Takes the reader to a question left blank: the card in view, its first option focused. */
function goToQuestion(index: number): void {
  document.getElementById(`mkx-q-${String(index)}`)?.scrollIntoView({ block: "start" });
  document.getElementById(`mock-${String(index)}-0`)?.focus({ preventScroll: true });
}

/**
 * The paper, over the whole screen like the final exam: a pinned bar with the
 * exam's name, how many questions have an answer, the clock (red in its last
 * minute) and the hand-in; under it the questions by module, and at the foot
 * the hand-in again with what is still blank.
 */
function Paper({
  pathTitle,
  parts,
  total,
  answers,
  left,
  busy,
  error,
  onPick,
  onSubmit,
  headingRef,
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
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}): React.ReactElement {
  const answered = Object.keys(answers).length;
  const blank = unansweredQuestions(
    parts.flatMap((part) => part.questions),
    answers,
  );
  const low = left < MOCK_LAST_MINUTE_MS;

  return (
    <section className="mkx-run" aria-label="Examen blanc en cours">
      <header className="mkx-bar">
        <div className="mkx-bar__inner">
          <div className="mkx-bar__exam">
            <span className="mkx-bar__mark mkx-hex" aria-hidden="true">
              <IconPaper />
            </span>
            <div className="mkx-bar__txt">
              <span className="mkx-bar__label">{"// Examen blanc"}</span>
              <h1 ref={headingRef} tabIndex={-1} className="mkx-bar__name mkx-focus">
                {pathTitle}
              </h1>
            </div>
          </div>

          <div className="mkx-bar__progress">
            <span className="mkx-bar__count">
              {String(answered)} / {String(total)} répondues
            </span>
            <ProgressBar value={answered} max={total} label="Questions répondues" />
          </div>

          <div
            className={low ? "mkx-timer mkx-timer--low" : "mkx-timer"}
            role="timer"
            aria-label="Temps restant"
          >
            <span className="mkx-timer__ico" aria-hidden="true">
              <IconClock />
            </span>
            <span className="mkx-timer__val">{mockClock(left)}</span>
            {low ? (
              <span className="mkx-timer__low" aria-hidden="true">
                Dernière minute
              </span>
            ) : null}
          </div>
          <span className="sr-only" aria-live="polite">
            {low ? "Moins d'une minute restante." : ""}
          </span>

          <button
            type="button"
            className="btn btn--accent btn--sm mkx-bar__submit"
            onClick={onSubmit}
            disabled={busy}
          >
            Rendre la copie
          </button>
        </div>
        {error !== null ? (
          <p role="alert" className="mkx-error mkx-bar__error">
            {error}
          </p>
        ) : null}
      </header>

      <div className="mkx-run__scroll">
        <div className="mkx-paper">
          {parts.map((part, p) => {
            const headId = `mkx-part-${String(p)}`;
            return (
              <section key={part.domain} className="mkx-part" aria-labelledby={headId}>
                <div className="mkx-head">
                  <h2 id={headId}>
                    <span aria-hidden="true">{"// "}</span>
                    Module · {part.domain}
                  </h2>
                  <span className="mkx-head__meta">
                    {part.questions.length} {plural(part.questions.length, "question")}
                  </span>
                </div>
                {part.questions.map((question) => (
                  <QuestionCard
                    key={question.index}
                    question={question}
                    picked={answers[String(question.index)]}
                    onPick={(k) => {
                      onPick(question.index, k);
                    }}
                  />
                ))}
              </section>
            );
          })}

          <div className="mkx-handin" data-complete={blank.length === 0 ? "true" : "false"}>
            <div className="mkx-handin__txt">
              {blank.length > 0 ? (
                <>
                  <p>
                    <b>
                      {blank.length} {plural(blank.length, "question")} sans réponse.
                    </b>{" "}
                    Une question laissée vide compte comme fausse.
                  </p>
                  <div className="mkx-jump" role="group" aria-label="Les questions sans réponse">
                    {blank.map((question) => (
                      <button
                        key={question.index}
                        type="button"
                        className="mkx-jump__btn"
                        aria-label={`Aller à la question ${pad2(question.index + 1)}`}
                        onClick={() => {
                          goToQuestion(question.index);
                        }}
                      >
                        {pad2(question.index + 1)}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p>
                  <b>Toutes les questions ont une réponse.</b> Relis-toi si tu veux, puis rends ta
                  copie.
                </p>
              )}
            </div>
            <button
              type="button"
              className="btn btn--accent btn--lg"
              onClick={onSubmit}
              disabled={busy}
            >
              Rendre la copie
              <IconArrowRight />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Result ────────────────────────────────────────────────────────────────

/** A review row's tone, by the state of its answer. */
const REVIEW_TONE: Record<MockAnswerState, Tone> = { right: "ok", wrong: "low", blank: "none" };

/** A question of the correction: closed when it was right, open when it was not. */
function ReviewRow({ item }: { item: MockReviewItem }): React.ReactElement {
  const state = answerState(item);
  const tone = REVIEW_TONE[state];
  const word = ANSWER_WORD[state];
  return (
    <li>
      <details className="mkx-rev" data-tone={tone} open={!item.right}>
        <summary className="mkx-rev__sum">
          <span className="mkx-rev__mark" aria-hidden="true">
            {state === "right" ? <IconCheck /> : state === "blank" ? <IconDash /> : <IconCross />}
          </span>
          <span>
            <span className="mkx-rev__num">
              Question {pad2(item.index + 1)} · <b>{word}</b> · {item.domain}
            </span>
            <span className="mkx-rev__q">{item.question}</span>
          </span>
          <span className="mkx-rev__chev" aria-hidden="true">
            <IconChevron />
          </span>
        </summary>
        <div className="mkx-rev__body">
          <ul className="mkx-answers">
            {item.options.map((option, k) => {
              const right = k === item.correct;
              const picked = k === item.selected;
              const tag = optionTag(item, k);
              return (
                <li
                  key={`${String(k)}-${option}`}
                  className="mkx-ans"
                  data-tone={right ? "ok" : picked ? "low" : undefined}
                >
                  <span className="mkx-ans__key">{optionKey(k)}</span>
                  <span className="mkx-ans__text">{option}</span>
                  {tag !== null ? <span className="mkx-ans__tag">{tag}</span> : null}
                </li>
              );
            })}
            {item.selected === null ? (
              <li className="mkx-ans" data-tone="none">
                <span className="mkx-ans__key" aria-hidden="true">
                  –
                </span>
                <span className="mkx-ans__text">Aucune réponse donnée</span>
                <span className="mkx-ans__tag">Ta réponse</span>
              </li>
            ) : null}
          </ul>
          {item.explanation !== null && item.explanation !== "" ? (
            <div className="mkx-explain">
              <IconInfo />
              <p className="mkx-explain__txt">
                <span className="mkx-explain__lbl">{"// Explication"}</span>
                {item.explanation}
              </p>
            </div>
          ) : null}
        </div>
      </details>
    </li>
  );
}

/**
 * The way out of a result: another draw, or back to the path. A failed restart
 * shows above each row, so it sits by whichever button was pressed; only one
 * row announces it (`announce`), so it is read out once.
 */
function ResultActions({
  pathSlug,
  busy,
  error,
  announce,
  onRestart,
}: {
  pathSlug: string;
  busy: boolean;
  error: string | null;
  announce: boolean;
  onRestart: () => void;
}): React.ReactElement {
  return (
    <>
      {error !== null ? (
        <p role={announce ? "alert" : undefined} className="mkx-error">
          {error}
        </p>
      ) : null}
      <div className="mkx-actions">
        <button type="button" className="btn btn--accent" onClick={onRestart} disabled={busy}>
          Recommencer avec d&apos;autres questions
        </button>
        <Link href={`/paths/${pathSlug}`} className="btn btn--ghost">
          Retour au parcours
        </Link>
      </div>
    </>
  );
}

/**
 * The copy handed in: the score in the gauge, its verdict and what to go back
 * to first, the answers right, wrong and blank; then the score of each module
 * beside the correction, question by question, following the reader down it.
 */
function Result({
  result,
  late,
  pathSlug,
  busy,
  error,
  onRestart,
  headingRef,
}: {
  result: MockResult;
  late: boolean;
  pathSlug: string;
  busy: boolean;
  error: string | null;
  onRestart: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}): React.ReactElement {
  const first = new Set(weakestDomains(result.domains).map((d) => d.domain));
  const { wrong, blank } = answerCounts(result.review);
  // The gauge's ring: a circle of radius 86 in a 200 box, filled to the score.
  const ring = 2 * Math.PI * 86;
  // The focus lands on the heading at hand-in, past the gauge and the badge:
  // the heading says the score first, for whoever does not see them.
  const scoreSaid = `${String(result.score)} %, ${domainVerdict(result.score)}. `;

  return (
    <section className="mkx-result" aria-label="Résultat de l'examen blanc">
      <div className="mkx-hero" data-tone={verdictTone(result.score)}>
        <div className="mkx-gauge">
          <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
            <circle className="mkx-gauge__track" cx="100" cy="100" r="86" />
            <circle
              className="mkx-gauge__fill"
              cx="100"
              cy="100"
              r="86"
              strokeDasharray={ring}
              strokeDashoffset={ring * (1 - result.score / 100)}
            />
          </svg>
          <div className="mkx-gauge__center">
            <p className="mkx-gauge__pct">{result.score} %</p>
            <p className="mkx-gauge__sub">Score global</p>
          </div>
        </div>

        <div>
          <p className="mkx-badge">{domainVerdict(result.score)}</p>
          <h1 ref={headingRef} tabIndex={-1} className="mkx-hero__title mkx-focus">
            <span className="sr-only">{scoreSaid}</span>
            {mockAdvice(result.domains)}
          </h1>
          <p className="mkx-hero__desc">
            {result.correct} {plural(result.correct, "bonne")} {plural(result.correct, "réponse")}{" "}
            sur {result.total}
            {late ? ", copie rendue après le temps imparti" : ""}.
          </p>

          <ul className="mkx-substats">
            <li>
              <span className="mkx-substats__val" data-tone="ok">
                {result.correct}
              </span>
              <span className="mkx-substats__lbl">{plural(result.correct, "Juste")}</span>
            </li>
            <li>
              <span className="mkx-substats__val" data-tone="low">
                {wrong}
              </span>
              <span className="mkx-substats__lbl">{plural(wrong, "Fausse")}</span>
            </li>
            <li>
              <span className="mkx-substats__val">{blank}</span>
              <span className="mkx-substats__lbl">Sans réponse</span>
            </li>
          </ul>

          <ResultActions
            pathSlug={pathSlug}
            busy={busy}
            error={error}
            announce
            onRestart={onRestart}
          />
        </div>
      </div>

      <div className="mkx-detail">
        <StickyRail
          as="section"
          className="mkx-block mkx-detail__scores"
          aria-labelledby="mkx-domains-title"
        >
          <div className="mkx-head">
            <h2 id="mkx-domains-title">
              <span aria-hidden="true">{"// "}</span>
              Score par module
            </h2>
            <ul className="mkx-legend" aria-label="Les verdicts">
              <li data-tone="ok">acquis</li>
              <li data-tone="mid">à consolider</li>
              <li data-tone="low">à revoir</li>
            </ul>
          </div>
          <ul className="mkx-doms" aria-label="Score par module">
            {result.domains.map((domain) => (
              <li key={domain.domain} className="mkx-dom" data-tone={verdictTone(domain.percent)}>
                <span className="mkx-dom__name">
                  {domain.domain}
                  {first.has(domain.domain) ? (
                    <span className="mkx-dom__first">En premier</span>
                  ) : null}
                </span>
                <span className="mkx-dom__score">
                  {domain.correct} / {domain.total} · {domainVerdict(domain.percent)}
                </span>
                <span className="mkx-meter" aria-hidden="true">
                  <i style={{ width: `${String(domain.percent)}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </StickyRail>

        <section className="mkx-block" aria-label="Correction">
          <div className="mkx-head">
            <h2>
              <span aria-hidden="true">{"// "}</span>
              Correction
            </h2>
            <ul className="mkx-legend" aria-label="Les états d'une réponse">
              <li data-tone="ok">Juste</li>
              <li data-tone="low">Fausse</li>
              <li data-tone="none">Sans réponse</li>
            </ul>
          </div>
          <ol className="mkx-revs">
            {result.review.map((item) => (
              <ReviewRow key={item.index} item={item} />
            ))}
          </ol>
        </section>
      </div>

      <div className="mkx-end">
        <ResultActions
          pathSlug={pathSlug}
          busy={busy}
          error={error}
          announce={false}
          onRestart={onRestart}
        />
      </div>
    </section>
  );
}

// ── The flow ──────────────────────────────────────────────────────────────

/**
 * A mock exam, from the paper to the review: the questions with a countdown
 * (handed in by itself at zero), then the score by module, what to go back
 * to, and each question with its answer. What the exam covers and the
 * attempts already made are shown before, in the window on the path's page
 * (mock-exam-intro.tsx), whose "Commencer" leads here with ?go=1: the exam
 * starts as the page opens, once. Without it, nothing starts and the reader
 * goes to the window. The focus follows the stage, to the paper's name when
 * it opens and to the verdict when the copy is handed in.
 */
export function MockExamFlow({ overview }: { overview: MockOverview }): React.ReactElement {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ kind: "opening" });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(overview.ready);
  const [leaving, setLeaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const submitting = useRef(false);
  // The hand-in at zero is tried once: if it fails, the buttons stay to try
  // again, rather than a request every second until the rate limit refuses.
  const autoSent = useRef(false);
  // The start on opening is asked once, even when React runs the effect twice.
  const opened = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const start = useCallback(async (): Promise<void> => {
    setBusy(true);
    setError(null);
    let started: Awaited<ReturnType<typeof startMockExamAction>>;
    try {
      started = await startMockExamAction(overview.pathId);
    } catch {
      // The call itself failed (the network, a deploy): nothing was drawn.
      setBusy(false);
      setError("Impossible de lancer l'examen pour l'instant. Réessaie dans un moment.");
      return;
    }
    setBusy(false);
    if (!started.ok) {
      setError(started.error);
      return;
    }
    leaveGo();
    setAnswers({});
    submitting.current = false;
    autoSent.current = false;
    // From the moment it starts: the clock otherwise opens on the time the
    // request took, for its first second.
    setNow(Date.now());
    setStage({
      kind: "running",
      attemptId: started.attemptId,
      deadline: new Date(started.startedAt).getTime() + started.timeLimitMinutes * 60_000,
      questions: started.questions,
    });
  }, [overview.pathId]);

  // The window's "Commencer" (or "Reprendre") led here: the exam starts now.
  // Read from the address as the page opens, not from the server's props: Back
  // or Forward to this page (?go=1 already off) restores it from the router's
  // cache, with no request for the redirect to answer, and it must not draw a
  // paper and start the clock without a click. It goes to the window instead,
  // as a page load would.
  useEffect(() => {
    if (opened.current || !overview.ready) return;
    opened.current = true;
    if (!startedByWindow()) {
      setLeaving(true);
      router.replace(mockWindowHref(overview.pathSlug));
      return;
    }
    void start();
  }, [overview.ready, overview.pathSlug, router, start]);

  const submit = useCallback(async (): Promise<void> => {
    if (stage.kind !== "running" || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    const handed = await submitMockExamAction(stage.attemptId, answers);
    setBusy(false);
    if (!handed.ok) {
      submitting.current = false;
      setError(handed.error);
      return;
    }
    setStage({ kind: "result", result: handed.result, late: handed.late });
  }, [stage, answers]);

  // The clock: a tick a second while running, and the attempt handed in at zero.
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

  // The focus follows the stage: to the paper's name, then to the verdict.
  useEffect(() => {
    if (stage.kind !== "opening") headingRef.current?.focus();
  }, [stage.kind]);

  const parts = useMemo(
    () => (stage.kind === "running" ? mockParts(stage.questions) : []),
    [stage],
  );

  if (stage.kind === "running") {
    return (
      <Paper
        pathTitle={overview.pathTitle}
        parts={parts}
        total={stage.questions.length}
        answers={answers}
        left={stage.deadline - now}
        busy={busy}
        error={error}
        onPick={(index, k) => {
          setAnswers((prev) => ({ ...prev, [String(index)]: k }));
        }}
        onSubmit={() => void submit()}
        headingRef={headingRef}
      />
    );
  }

  if (stage.kind === "result") {
    return (
      <Result
        result={stage.result}
        late={stage.late}
        pathSlug={overview.pathSlug}
        busy={busy}
        error={error}
        onRestart={() => void start()}
        headingRef={headingRef}
      />
    );
  }

  return (
    <Opening
      overview={overview}
      busy={busy}
      error={error}
      leaving={leaving}
      onRetry={() => void start()}
    />
  );
}
