"use client";

import { quizAnchor } from "@cyberlearn/lib/revisions/passage";
import React, { useContext, useEffect, useRef, useState } from "react";
import { useLessonCompletion } from "./lesson-completion-context";
import { useLessonQuiz, type QuizAnswer } from "./lesson-quiz-context";
import { InQuizGroup } from "./quiz-group-context";
import { QuizReport } from "./quiz-report";
import "./quiz.css";

/**
 * One question, one answer.
 *
 * A wrong answer used to be retried until it was right, so every lesson ended
 * the same whatever the learner knew, and a quiz inside a group folded away
 * once answered while a quiz on its own stayed open. Now:
 *
 *  - the first answer is the answer: it is recorded on the server, which
 *    decides whether it is right, and it cannot be changed;
 *  - the verdict shows as soon as the answer is sent, drawn from the key the
 *    page holds, and the server's record replaces it when it comes back
 *    (lesson-quiz-context.tsx);
 *  - an answered quiz stays open, showing the right option and the
 *    explanation when the author wrote one;
 *  - answering, right or wrong, is what lets the section go on, once the
 *    server has the answer.
 *
 * Outside a lesson page (an editor preview) there is no record to write to,
 * and the quiz scores itself locally.
 *
 * On a lesson page the options are shown in an order of the learner's own
 * (see quizOptionOrder): authors put the right answer second in most quizzes.
 * Only the display moves. The index sent, stored and compared is the option's
 * written index; the letters follow the display. A preview keeps the written
 * order, which is what its author is checking.
 *
 * In a QuizGroup the group asks one question at a time (quiz-group.tsx): it
 * holds the section's gate for all of its questions, passes the answer a
 * preview keeps, and gives each answered question its way on (`next`).
 */

/** The way on from an answered question, given by its QuizGroup. */
export interface QuizNextAction {
  label: string;
  onSelect: () => void;
  /** Pressed before the server confirmed the answer: it goes on once it has. */
  waiting?: boolean;
}

interface QuizProps {
  id: string;
  question: string;
  /** Primary prop name used in MDX template and authoring guide. */
  options?: string[];
  /** Legacy alias - kept for backwards compatibility. */
  choices?: string[];
  correct: number;
  /** Why the right answer is right. Shown once the question is answered. */
  explanation?: string;
  questionNumber?: number;
  questionCount?: number;
  /** Injected by QuizGroup without a lesson record: the answer it keeps for this question. */
  localAnswer?: QuizAnswer | undefined;
  /** Injected by QuizGroup without a lesson record: called when this question is answered. */
  onAnswered?: ((answer: QuizAnswer) => void) | undefined;
  /** Injected by QuizGroup: shown once the question is answered. */
  next?: QuizNextAction | undefined;
}

const LETTER = ["A", "B", "C", "D", "E", "F"];

export function Quiz({
  id,
  question,
  options,
  choices,
  correct,
  explanation,
  questionNumber,
  questionCount,
  localAnswer,
  onAnswered,
  next,
}: QuizProps): React.ReactElement {
  const items = options ?? choices ?? [];
  const lessonQuiz = useLessonQuiz();
  const grouped = useContext(InQuizGroup);
  const [picked, setPicked] = useState<number | null>(null);
  const [ownAnswer, setOwnAnswer] = useState<QuizAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const answer = lessonQuiz ? (lessonQuiz.answers[id] ?? null) : (localAnswer ?? ownAnswer);
  // Shown, and not yet on record: the options are locked, the gate is not moved.
  const sending = lessonQuiz?.unconfirmed.has(id) === true;
  const confirmed = answer !== null && !sending;
  // order[position] = written index of the option shown at that position.
  const order = lessonQuiz ? lessonQuiz.optionOrder(id, items) : items.map((_, i) => i);
  const letterOf = (written: number): string => {
    const position = order.indexOf(written);
    return LETTER[position] ?? String(position + 1);
  };
  const answered = answer !== null;

  const completion = useLessonCompletion();
  // Ref to always call the latest callbacks without triggering re-registration
  // when isAllComplete/pendingCount change (which would cause an infinite loop).
  const completionRef = useRef(completion);
  completionRef.current = completion;

  // A grouped question is held by its group, which asks one question at a
  // time and must hold the section for the questions not on screen too.
  useEffect(() => {
    if (grouped) return;
    completionRef.current?.register(id);
    return () => {
      completionRef.current?.unregister(id);
    };
  }, [id, grouped]);

  // Answered and on record - now, or before this section was last on screen - is done.
  useEffect(() => {
    if (grouped || !confirmed) return;
    completionRef.current?.markDone(id);
  }, [confirmed, grouped, id]);

  function validate(): void {
    if (picked === null || answered) return;
    setError(null);
    const verdict = { selected: picked, correct: picked === correct };
    if (!lessonQuiz) {
      setOwnAnswer(verdict);
      onAnswered?.(verdict);
      return;
    }
    void lessonQuiz.submit(id, picked, verdict.correct).then((result) => {
      if (!result.ok) setError(result.error);
    });
  }

  const chosen = answered ? answer.selected : picked;
  const isCorrect = answered && answer.correct;
  const rightOption = items[correct];
  const verdictText = explanation?.trim()
    ? explanation.trim()
    : !isCorrect && rightOption !== undefined
      ? `La bonne réponse était ${letterOf(correct)} : ${rightOption}.`
      : null;
  const tone = isCorrect ? "right" : "wrong";

  return (
    <section
      // "Revoir ce passage" lands here from a review question (revisions/passage.ts).
      id={quizAnchor(id)}
      className="cl-quiz"
      data-grouped={grouped ? "" : undefined}
      aria-label={questionNumber !== undefined ? `Question ${String(questionNumber)}` : "Question"}
    >
      <div className="cl-quiz-head">
        <span className="cl-quiz-kicker">
          {questionNumber !== undefined && questionCount !== undefined
            ? `Question ${String(questionNumber)} sur ${String(questionCount)}`
            : "Question"}
        </span>
        {answered && (
          <span role="status" className="cl-quiz-verdict" data-tone={tone}>
            {isCorrect ? "✓ Bonne réponse" : "✗ Mauvaise réponse"}
          </span>
        )}
      </div>

      {/* The group moves focus here when it puts this question on screen. */}
      <h3 className="cl-quiz-question" tabIndex={-1}>
        {question}
      </h3>

      <div role="radiogroup" aria-label={question} className="cl-quiz-options">
        {order.map((i, position) => {
          const choice = items[i] ?? "";
          const isChosen = chosen === i;
          const isThisCorrect = answered && i === correct;
          const isThisWrong = answered && isChosen && i !== correct;

          let state = "idle";
          let stateLabel = "";
          if (isThisCorrect) {
            state = "right";
            stateLabel = isChosen ? "Ton choix · bonne réponse" : "Bonne réponse";
          } else if (isThisWrong) {
            state = "wrong";
            stateLabel = "Ton choix";
          } else if (answered) {
            state = "other";
          } else if (isChosen) {
            state = "picked";
          }

          return (
            <label key={i} className="cl-quiz-option" data-state={state}>
              <input
                type="radio"
                name={`quiz-${id}`}
                value={i}
                checked={isChosen}
                onChange={() => {
                  setPicked(i);
                  setError(null);
                }}
                className="sr-only"
                disabled={answered}
              />
              <span className="cl-quiz-letter">{LETTER[position]}</span>
              <span className="cl-quiz-choice">{choice}</span>
              {stateLabel !== "" && <span className="cl-quiz-state">{stateLabel}</span>}
            </label>
          );
        })}
      </div>

      {answered ? (
        <>
          {verdictText !== null && (
            <div className="cl-quiz-explanation" data-tone={tone}>
              <p className="cl-quiz-explanation-title">
                {explanation?.trim() ? "Pourquoi" : "Correction"}
              </p>
              <p className="cl-quiz-explanation-body">{verdictText}</p>
            </div>
          )}
          {next && (
            <button
              type="button"
              className="cl-quiz-button"
              aria-busy={next.waiting === true ? true : undefined}
              onClick={next.onSelect}
            >
              {next.label}
              {next.waiting !== true && <span aria-hidden="true"> →</span>}
            </button>
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            className="cl-quiz-button"
            disabled={picked === null}
            onClick={validate}
          >
            Valider la réponse
          </button>
          <p
            role={error !== null ? "alert" : undefined}
            className="cl-quiz-note"
            data-error={error !== null ? "" : undefined}
          >
            {error ?? "Une seule réponse par question : elle compte dans ta note de la leçon."}
          </p>
        </>
      )}
      <QuizReport quizId={id} />
    </section>
  );
}
