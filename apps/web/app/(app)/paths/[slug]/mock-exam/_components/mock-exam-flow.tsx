"use client";

// "use client" justification: the flow keeps the clock and the answers in the
// browser between the start and the hand-in; the draw and the score are the
// server's (../_actions/mock-exam-actions.ts).

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type MockAnswerState,
  type MockPart,
  type MockQuestion,
  type MockResult,
  type MockReviewItem,
} from "@cyberlearn/lib/exam/mock";
import { Brackets } from "@/app/_components/corner-brackets";
import { ProgressBar } from "@/components/progress-bar";
import type { MockOverview } from "@/lib/exam/mock-exam";
import { startMockExamAction, submitMockExamAction } from "../_actions/mock-exam-actions";
import "./mock-exam.css";

type Stage =
  | { kind: "intro" }
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

// Pinned to the site's zone, so the server and the browser print the same day.
const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function plural(n: number, word: string): string {
  return n > 1 ? `${word}s` : word;
}

// ── Icons (decorative: every one sits beside the words it illustrates) ──────

function Svg({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const IconClock = (): React.ReactElement => (
  <Svg>
    <circle cx="8" cy="9" r="5.2" />
    <path d="M8 6.6V9l1.8 1.3M6.2 2.5h3.6" />
  </Svg>
);
const IconQuestion = (): React.ReactElement => (
  <Svg>
    <path d="M5.8 6a2.2 2.2 0 1 1 3.2 2c-.6.3-1 .8-1 1.5V10" />
    <path d="M8 12.6v.4" />
  </Svg>
);
const IconModules = (): React.ReactElement => (
  <Svg>
    <path d="M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z" />
  </Svg>
);
const IconPaper = (): React.ReactElement => (
  <Svg>
    <path d="M3.5 1.8h6.2l2.8 2.8v9.6h-9zM5.8 7.5h4.4M5.8 10.2h4.4" />
  </Svg>
);
const IconCheck = (): React.ReactElement => (
  <Svg>
    <path d="M3 8.5 6.5 12 13 4.5" />
  </Svg>
);
const IconCross = (): React.ReactElement => (
  <Svg>
    <path d="m4 4 8 8M12 4l-8 8" />
  </Svg>
);
const IconDash = (): React.ReactElement => (
  <Svg>
    <path d="M4 8h8" />
  </Svg>
);
const IconArrowRight = (): React.ReactElement => (
  <Svg>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </Svg>
);
const IconArrowLeft = (): React.ReactElement => (
  <Svg>
    <path d="M13 8H3m4-4L3 8l4 4" />
  </Svg>
);
const IconChevron = (): React.ReactElement => (
  <Svg>
    <path d="m6 3 5 5-5 5" />
  </Svg>
);
const IconInfo = (): React.ReactElement => (
  <Svg>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 7.2v4M8 4.8v.2" />
  </Svg>
);

// ── Intro ─────────────────────────────────────────────────────────────────

/**
 * Before an attempt, framed like the final exam's intro: the path, what the
 * exam is and its three figures, the rules a practice run actually has, and
 * the way in; beside it, the modules it covers (with the last score of each,
 * once there is one) and the attempts already handed in.
 */
function Intro({
  overview,
  busy,
  error,
  onStart,
}: {
  overview: MockOverview;
  busy: boolean;
  error: string | null;
  onStart: () => void;
}): React.ReactElement {
  const { history } = overview;
  const lastByDomain = lastDomainScores(history);
  const best = bestScore(history);
  const moduleCount = overview.domains.length;

  return (
    <section className="mkx-intro" aria-label="Examen blanc">
      <Brackets />

      <div className="mkx-intro__main">
        <p className="mkx-eyebrow">{"// Examen blanc"}</p>
        <h1 className="pg-title">{overview.pathTitle}</h1>
        <p className="pg-lede">
          {String(overview.questionCount)} questions tirées des quiz du parcours, trois par module,
          en {String(overview.timeLimitMinutes)} minutes. Comme à une certification, le score se lit
          par module : chaque module dit ce qui est acquis et ce qui reste à revoir.
        </p>

        <ul className="mkx-stats" aria-label="L'examen en chiffres">
          <li className="mkx-stat">
            <span className="mkx-stat__hex mkx-hex" aria-hidden="true">
              <IconQuestion />
            </span>
            <span className="mkx-stat__val">{overview.questionCount}</span>
            <span className="mkx-stat__lbl">Questions</span>
          </li>
          <li className="mkx-stat">
            <span className="mkx-stat__hex mkx-hex" aria-hidden="true">
              <IconClock />
            </span>
            <span className="mkx-stat__val">
              {overview.timeLimitMinutes}
              <small> min</small>
            </span>
            <span className="mkx-stat__lbl">Chrono</span>
          </li>
          <li className="mkx-stat">
            <span className="mkx-stat__hex mkx-hex" aria-hidden="true">
              <IconModules />
            </span>
            <span className="mkx-stat__val">{moduleCount}</span>
            <span className="mkx-stat__lbl">{plural(moduleCount, "Module")}</span>
          </li>
        </ul>

        <ul className="mkx-rules">
          <li>
            <span className="mkx-rules__k">Chrono</span>
            <span>
              Il part dès que tu commences et ne s&apos;arrête plus. À 00:00, ta copie est rendue
              telle quelle.
            </span>
          </li>
          <li>
            <span className="mkx-rules__k">Verdict</span>
            <span>
              Chaque module reçoit le sien : acquis, à consolider ou à revoir, avec la correction de
              chaque question.
            </span>
          </li>
          <li>
            <span className="mkx-rules__k">Sans enjeu</span>
            <span>
              C&apos;est un entraînement : ni certificat, ni XP, autant de fois que tu veux.
            </span>
          </li>
        </ul>

        {overview.ready && overview.running !== null ? (
          <p className="mkx-live">
            <span className="mkx-live__dot" aria-hidden="true" />
            Un examen blanc est en cours : le chrono tourne toujours. Tes réponses d&apos;avant ne
            sont pas gardées.
          </p>
        ) : null}
        {error !== null ? (
          <p role="alert" className="mkx-error">
            {error}
          </p>
        ) : null}
        {overview.ready ? null : (
          <p className="mkx-note">
            Ce parcours n&apos;a pas encore assez de questions pour un examen blanc.
          </p>
        )}

        <div className="mkx-cta">
          {overview.ready ? (
            <button
              type="button"
              className="btn btn--accent btn--lg mkx-start"
              onClick={onStart}
              disabled={busy}
            >
              {overview.running !== null
                ? "Reprendre l'examen en cours"
                : "Commencer l'examen blanc"}
              <IconArrowRight />
            </button>
          ) : null}
          <Link href={`/paths/${overview.pathSlug}`} className="mkx-back">
            <IconArrowLeft />
            Retour au parcours
          </Link>
        </div>
      </div>

      <div className="mkx-intro__side">
        <div>
          <div className="mkx-head">
            <h2>
              <span aria-hidden="true">{"// "}</span>
              Les modules couverts
            </h2>
            <span className="mkx-head__meta">
              {moduleCount} {plural(moduleCount, "module")}
            </span>
          </div>
          {moduleCount > 0 ? (
            <ul className="mkx-mods" aria-label="Les modules couverts">
              {overview.domains.map((domain) => {
                const last = lastByDomain.get(domain.domain);
                return (
                  <li key={domain.domain}>
                    <span className="mkx-mods__name">{domain.domain}</span>
                    <span className="mkx-mods__n">
                      {String(domain.drawn)} question{domain.drawn > 1 ? "s" : ""}
                    </span>
                    {last !== undefined ? (
                      <span className="mkx-mods__last" data-tone={verdictTone(last.percent)}>
                        Dernier examen : {last.correct} / {last.total} ·{" "}
                        {domainVerdict(last.percent)}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mkx-empty">Aucun module de ce parcours n&apos;a encore de quiz.</p>
          )}
        </div>

        <section aria-labelledby="mkx-hist-title">
          <div className="mkx-head">
            <h2 id="mkx-hist-title">
              <span aria-hidden="true">{"// "}</span>
              Tes examens blancs
            </h2>
            {best !== null ? (
              <span className="mkx-head__meta">
                {history.length} derniers · meilleur {best} %
              </span>
            ) : null}
          </div>
          {history.length > 0 ? (
            <ol className="mkx-hist">
              {history.map((attempt) => (
                <li key={attempt.submittedAt} data-tone={verdictTone(attempt.score)}>
                  <span className="mkx-hist__date">
                    {dayFormat.format(new Date(attempt.submittedAt))}
                  </span>
                  <span className="mkx-meter" aria-hidden="true">
                    <i style={{ width: `${String(attempt.score)}%` }} />
                  </span>
                  <span className="mkx-hist__score">
                    {attempt.score} %
                    {attempt.late ? <span className="mkx-hist__late">hors délai</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mkx-empty">
              Aucun examen blanc rendu sur ce parcours pour l&apos;instant : tes scores
              s&apos;afficheront ici.
            </p>
          )}
        </section>
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
 * beside the correction, question by question.
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
        <section className="mkx-block" aria-labelledby="mkx-domains-title">
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
        </section>

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
 * A mock exam, from the overview to the review: the modules it covers and
 * the attempts already made, then the questions with a countdown (handed in
 * by itself at zero), then the score by module, what to go back to, and each
 * question with its answer. The focus follows the stage, to the paper's name
 * when it opens and to the verdict when the copy is handed in.
 */
export function MockExamFlow({ overview }: { overview: MockOverview }): React.ReactElement {
  const [stage, setStage] = useState<Stage>({ kind: "intro" });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const submitting = useRef(false);
  // The hand-in at zero is tried once: if it fails, the buttons stay to try
  // again, rather than a request every second until the rate limit refuses.
  const autoSent = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const start = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const started = await startMockExamAction(overview.pathId);
    setBusy(false);
    if (!started.ok) {
      setError(started.error);
      return;
    }
    setAnswers({});
    submitting.current = false;
    autoSent.current = false;
    // From the moment it starts: the clock otherwise opens on the time the
    // intro sat open, for its first second.
    setNow(Date.now());
    setStage({
      kind: "running",
      attemptId: started.attemptId,
      deadline: new Date(started.startedAt).getTime() + started.timeLimitMinutes * 60_000,
      questions: started.questions,
    });
  };

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

  // The focus follows the stage: the intro's button is gone once it is pressed.
  useEffect(() => {
    if (stage.kind !== "intro") headingRef.current?.focus();
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

  return <Intro overview={overview} busy={busy} error={error} onStart={() => void start()} />;
}
