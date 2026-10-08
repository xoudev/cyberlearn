"use client";

// "use client" justification: the duel is read again every few seconds while
// it is going on, so the other's score moves, and each answer is sent and
// checked as it is picked.

import Link from "next/link";
import React, { useEffect, useState, useTransition } from "react";
import {
  deadlineLabel,
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
  type DuelOutcome,
  type DuelResultOutcome,
} from "@cyberlearn/lib/social/duel";
import { CornerBrackets } from "@/app/_components/corner-brackets";
import { initialsOf } from "@/lib/avatar/glyphs";
import type { DuelView } from "@/lib/social/duels";
import { answerDuelAction, duelViewAction } from "../../_actions/duel-actions";
import { pad2, plural, whenOf } from "../../_components/duel-words";
import { RespondButtons } from "../../_components/respond-buttons";
import "../../_components/duels.css";

/**
 * One duel, played: the header with its state, the scoreboard (both players
 * face to face, their right answers big, a square a question), then the one
 * thing to do now: the next question, the answer to an invitation, the wait
 * for the other, or the result and the reader's answers once both are done.
 * The page reads the duel again every few seconds while it is going on, so
 * the other player's score moves as they answer.
 */

/** How often the page reads the duel again while it is going on. */
const REFRESH_MS = 2500;

/** The keys the options are read by, as the final exam letters them. */
const KEYS = ["A", "B", "C", "D", "E", "F", "G", "H"];

function IconCheck(): React.JSX.Element {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8.5 6.5 12 13 4.5" />
    </svg>
  );
}

function IconCross(): React.JSX.Element {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

/**
 * A square a question, each drawn by its mark (the data-state values
 * duels.css styles). Decorative: the count beside it says the same in words.
 */
function Pips({ states }: { states: DuelMark[] }): React.JSX.Element {
  return (
    <span className="dl-pips" aria-hidden="true">
      {states.map((state, i) => (
        <span key={`${String(i)}-${state}`} className="dl-pip" data-state={state} />
      ))}
    </span>
  );
}

/**
 * One player's numbers: their right answers big, a square a question and the
 * count in words. Before the duel starts, or for one never played, a dash and
 * what it means instead, as the list's cards show it.
 */
function SideStats({
  score,
  pips,
  count,
  idle,
}: {
  score: { answered: number; correct: number };
  pips: DuelMark[];
  count: number;
  idle: string | null;
}): React.JSX.Element {
  if (idle !== null) {
    return (
      <p className="dl-side__score">
        <b aria-hidden="true">–</b>
        <span>{idle}</span>
      </p>
    );
  }
  return (
    <>
      <p className="dl-side__score">
        <b>{score.correct}</b>
        <span>{rightAnswersWord(score.correct)}</span>
      </p>
      <Pips states={pips} />
      <p className="dl-side__count">
        {String(score.answered)} / {String(count)} répondues
      </p>
    </>
  );
}

/** Both players face to face: monogram and name at the edges, the scores meeting in the middle. */
function Scoreboard({
  view,
  outcome,
  current,
}: {
  view: DuelView;
  outcome: DuelOutcome;
  current: number | null;
}): React.JSX.Element {
  const count = view.questionCount;
  const finished = view.status === "FINISHED";
  const idle = idleScoreWord(view.status);
  return (
    <section
      className="dl-board"
      aria-label="Les scores"
      data-outcome={finished ? outcome : undefined}
      data-idle={idle === null ? undefined : "true"}
    >
      <CornerBrackets color="var(--dl-accent)" size={12} thickness={2} />
      <div className="dl-side" data-side="reader">
        <div className="dl-side__who">
          <span className="dl-mono dl-mono--lg" data-me="true" aria-hidden="true">
            {initialsOf(view.reader.name)}
          </span>
          <span className="dl-side__name">
            <strong>Toi</strong>
            <span>{view.reader.name}</span>
          </span>
        </div>
        <div className="dl-side__stats">
          <SideStats
            score={view.readerScore}
            pips={readerMarks(count, view.readerAnswers, current)}
            count={count}
            idle={idle}
          />
        </div>
      </div>

      <div className="dl-board__vs">
        <span className="dl-vs">contre</span>
      </div>

      <div className="dl-side" data-side="other">
        <div className="dl-side__who">
          <span className="dl-mono dl-mono--lg" aria-hidden="true">
            {initialsOf(view.other.name)}
          </span>
          <span className="dl-side__name">
            <strong>{view.other.name}</strong>
            {view.other.username !== null && <span>@{view.other.username}</span>}
          </span>
        </div>
        <div className="dl-side__stats" aria-live="polite" aria-atomic="true">
          <SideStats
            score={view.otherScore}
            pips={otherMarks(count, view.otherScore.answered)}
            count={count}
            idle={idle}
          />
        </div>
      </div>
    </section>
  );
}

/** Waiting on the other player: a pulse, what is awaited, and when it comes. */
function Waiting({ title, text }: { title: string; text: string }): React.JSX.Element {
  return (
    <div className="dl-wait" role="status">
      <span className="dl-pulse" aria-hidden="true" />
      <div>
        <p className="dl-wait__title">{title}</p>
        <p className="dl-wait__text">{text}</p>
      </div>
    </div>
  );
}

/** The result in its tone, the score in words, and the way to a rematch. */
function Result({
  view,
  outcome,
}: {
  view: DuelView;
  outcome: DuelResultOutcome;
}): React.JSX.Element {
  const note = tieBreakNote(view);
  return (
    <section className="dl-result" data-outcome={outcome} aria-labelledby="dl-result-title">
      <p className="dl-result__eyebrow">Résultat</p>
      <h2 id="dl-result-title" className="dl-result__title">
        {RESULT_TITLE[outcome]}
      </h2>
      <p className="dl-result__line">
        {String(view.readerScore.correct)} à {String(view.otherScore.correct)} contre{" "}
        {view.other.name}.
      </p>
      {note !== null && <p className="dl-result__note">{note}</p>}
      <div className="dl-result__cta">
        <Link href={`/duels?ami=${view.other.id}`} className="btn btn--accent">
          Rejouer <span aria-hidden="true">→</span>
        </Link>
        <Link href="/duels" className="btn btn--ghost">
          Tous tes duels
        </Link>
      </div>
    </section>
  );
}

/** The reader's answers once the duel is settled: each question, their pick, the right one. */
function Review({ view }: { view: DuelView }): React.JSX.Element | null {
  const rows = reviewRows(view.questions, view.readerAnswers);
  if (rows.length === 0) return null;
  return (
    <section className="dl-review" aria-labelledby="dl-review-title">
      <div className="dl-review__head">
        <h2 id="dl-review-title" className="section-head">
          Tes réponses
        </h2>
        <Link href={`/paths/${view.pathSlug}`} className="dl-link">
          Revoir le parcours <span aria-hidden="true">→</span>
        </Link>
      </div>
      <ol className="dl-review__list">
        {rows.map((row) => (
          <li
            key={row.index}
            className="dl-review__row"
            data-outcome={VERDICT_OUTCOME[row.verdict]}
          >
            <span className="dl-review__n">{pad2(row.index + 1)}</span>
            <div>
              {row.domain !== "" && <span className="dl-review__domain">{row.domain}</span>}
              <p className="dl-review__q">{row.question}</p>
              <p className="dl-review__a">{row.given}</p>
              {row.right !== null && (
                <p className="dl-review__fix">
                  Bonne réponse : <b>{row.right}</b>
                </p>
              )}
            </div>
            <span className="dl-review__verdict">{VERDICT_LABEL[row.verdict]}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function DuelPlay({ initial }: { initial: DuelView }): React.ReactElement {
  const [view, setView] = useState(initial);
  // A view the server sends again replaces the one in hand: answering the
  // invitation re-renders this page with the duel accepted or declined, and
  // the state was seeded from the first view only, so the invitation stayed.
  const [served, setServed] = useState(initial);
  if (served !== initial) {
    setServed(initial);
    setView(initial);
  }
  const [feedback, setFeedback] = useState<{ index: number; correct: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** The option just clicked, framed while its answer is on its way. */
  const [picked, setPicked] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const live = view.status === "ACTIVE" || (view.status === "PENDING" && view.readerIsChallenger);
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      void duelViewAction(view.id).then((next) => {
        if (next !== null) setView(next);
      });
    }, REFRESH_MS);
    return () => {
      clearInterval(id);
    };
  }, [live, view.id]);

  const next = nextDuelQuestion(view.questions, view.readerAnswers);
  const last =
    feedback === null ? null : view.readerAnswers.find((a) => a.index === feedback.index);

  const answer = (index: number, selected: number): void => {
    startTransition(async () => {
      setError(null);
      const result = await answerDuelAction({ duelId: view.id, index, selected });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFeedback({ index, correct: result.correct });
      const fresh = await duelViewAction(view.id);
      if (fresh !== null) setView(fresh);
    });
  };

  const outcome = outcomeOf(view);
  const count = view.questionCount;
  const deadline = deadlineLabel(view.status);

  return (
    <section className="dl-duel" aria-label={`Duel contre ${view.other.name}`}>
      <header className="dl-duel-head">
        <div>
          <p className="pg-eyebrow">
            Duel · <b>{view.pathTitle}</b>
          </p>
          <h1 className="pg-title">Toi contre {view.other.name}</h1>
          <p className="pg-lede">
            {count} {plural(count, "question")}, les mêmes pour vous deux. Le plus de bonnes
            réponses gagne ; à égalité, le premier à finir.
          </p>
        </div>
        <div className="dl-state" aria-live="polite">
          <span className="dl-badge dl-badge--lg" data-outcome={outcome}>
            {live && <span className="dl-pulse" aria-hidden="true" />}
            {OUTCOME_LABEL[outcome]}
          </span>
          {deadline !== null && (
            <p className="dl-state__when">
              {deadline} <time dateTime={view.expiresAt}>{whenOf(view.expiresAt)}</time>
            </p>
          )}
        </div>
      </header>

      <Scoreboard
        view={view}
        outcome={outcome}
        current={view.status === "ACTIVE" ? (next?.index ?? null) : null}
      />

      <div className="dl-play">
        {/* Always mounted, so an answer's verdict is announced; emptied once the
            duel is settled, when the result and the review say it instead. */}
        <div className="dl-live" aria-live="polite">
          {view.status !== "FINISHED" &&
          last !== null &&
          last !== undefined &&
          feedback !== null ? (
            <div className="dl-feedback" data-outcome={feedback.correct ? "win" : "loss"}>
              <span className="dl-feedback__mark" aria-hidden="true">
                {feedback.correct ? <IconCheck /> : <IconCross />}
              </span>
              <span className="dl-feedback__q">Question {pad2(feedback.index + 1)}</span>
              <p className="dl-feedback__text">
                {feedback.correct ? "Bonne réponse." : "Raté."}
                {!feedback.correct && last.correctIndex !== null
                  ? ` La bonne réponse : ${view.questions.find((q) => q.index === last.index)?.options[last.correctIndex] ?? ""}.`
                  : ""}
              </p>
            </div>
          ) : null}
        </div>

        {view.status === "PENDING" ? (
          view.readerIsChallenger ? (
            <Waiting
              title={`Défi envoyé à ${view.other.name}`}
              text="Le duel commence quand il ou elle l'accepte, dans la journée."
            />
          ) : (
            <div className="dl-callout">
              <p className="dl-callout__eyebrow">Défi reçu</p>
              <p className="dl-callout__text">
                {view.other.name} te défie sur « {view.pathTitle} » : cinq questions, le meilleur
                score gagne.
              </p>
              <RespondButtons duelId={view.id} size="lg" />
            </div>
          )
        ) : null}

        {view.status === "DECLINED" || view.status === "EXPIRED" ? (
          <div className="dl-off">
            <p className="dl-off__text">
              {view.status === "DECLINED"
                ? "Ce duel a été refusé."
                : "Ce duel n'a pas été joué à temps."}
            </p>
            <Link
              href={`/duels?ami=${view.other.id}`}
              className="btn btn--accent btn--ghost btn--sm"
            >
              Relancer un duel
            </Link>
          </div>
        ) : null}

        {view.status === "ACTIVE" && next !== null ? (
          <section className="dl-q" aria-labelledby="dl-q-text">
            <p className="dl-q__eyebrow">
              Question {pad2(next.index + 1)}{" "}
              <span>
                / {pad2(count)}
                {next.domain !== "" ? ` · ${next.domain}` : ""}
              </span>
            </p>
            <h2 id="dl-q-text" className="dl-q__text">
              {next.question}
            </h2>
            <div className="dl-opts">
              {next.options.map((option, k) => (
                <button
                  key={k}
                  type="button"
                  className="dl-opt"
                  data-picked={pending && picked === k ? "true" : undefined}
                  disabled={pending}
                  onClick={() => {
                    setPicked(k);
                    answer(next.index, k);
                  }}
                >
                  <span className="dl-opt__key" aria-hidden="true">
                    {KEYS[k] ?? String(k + 1)}
                  </span>
                  <span className="dl-opt__text">{option}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {view.status === "ACTIVE" && next === null ? (
          <Waiting
            title="Tu as répondu à tout."
            text={`Le résultat tombe quand ${view.other.name} a fini, ou à la fin de la journée.`}
          />
        ) : null}

        {view.status === "FINISHED" && isSettled(outcome) ? (
          <Result view={view} outcome={outcome} />
        ) : null}

        {error !== null ? (
          <p role="alert" className="dl-error">
            {error}
          </p>
        ) : null}

        {view.status === "FINISHED" ? (
          <Review view={view} />
        ) : (
          <Link href="/duels" className="btn btn--ghost btn--sm">
            <span aria-hidden="true">←</span> Tous tes duels
          </Link>
        )}
      </div>
    </section>
  );
}
