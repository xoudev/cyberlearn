"use client";

import { SECTION_PARAM, quizAnchor } from "@cyberlearn/lib/revisions/passage";
import { type ReadonlyURLSearchParams, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLessonCompletion } from "./lesson-completion-context";
import { useLessonQuiz, type QuizAnswer } from "./lesson-quiz-context";
import type { QuizNextAction } from "./quiz";
import { InQuizGroup } from "./quiz-group-context";
import "./quiz.css";

export interface QuizGroupProps {
  children: React.ReactNode;
}

interface QuizChildProps {
  id?: string;
  question?: string;
  questionNumber?: number;
  questionCount?: number;
  localAnswer?: QuizAnswer | undefined;
  onAnswered?: ((answer: QuizAnswer) => void) | undefined;
  next?: QuizNextAction | undefined;
}

/** What the group has on screen: a question, by its place, or the result. */
type View = number | "result";

/**
 * The address's query, or null outside Next's router (a component test, a
 * preview drawn on its own), which the type of useSearchParams leaves out.
 */
function useSearchParamsOutsideRouter(): ReadonlyURLSearchParams | null {
  return useSearchParams();
}

/**
 * A series of questions, asked one at a time.
 *
 * The questions used to pile up: each answer opened the next one under it,
 * and the learner scrolled through a growing column to find the question
 * being asked. Now the question on screen is the only one. Once it is
 * answered, right or wrong, its verdict and explanation stay until the
 * learner asks for the next question, which takes its place; after the last
 * one comes the result. The progress above tells each question's state and
 * opens any question already answered, to read it again.
 *
 * A wrong answer is explained, not retried. Answers come from the lesson's
 * record (LessonQuizProvider), so a reload, or a return to this section,
 * opens the first question not answered yet, or the result. In an editor's
 * preview there is no record, and the group keeps the answers itself.
 *
 * The group, not each question, holds the section's gate: the questions not on
 * screen are not mounted, and would otherwise not be counted at all.
 */
export function QuizGroup({ children }: QuizGroupProps): React.ReactElement {
  const lessonQuiz = useLessonQuiz();
  // SAFETY: the group's children are the <Quiz> elements the author wrote.
  const items = React.Children.toArray(children).filter(
    React.isValidElement,
  ) as React.ReactElement<QuizChildProps>[];
  const total = items.length;
  const ids = items.map((child) => child.props.id);

  // Without a lesson record (an editor preview), answers are kept here.
  const [localAnswers, setLocalAnswers] = useState<Record<number, QuizAnswer>>({});

  const answerAt = (i: number): QuizAnswer | undefined => {
    const id = ids[i];
    if (lessonQuiz) return id === undefined ? undefined : lessonQuiz.answers[id];
    return localAnswers[i];
  };
  const confirmedAt = (i: number): boolean => {
    if (answerAt(i) === undefined) return false;
    const id = ids[i];
    return !(lessonQuiz && id !== undefined && lessonQuiz.unconfirmed.has(id));
  };

  const answers = items.map((_, i) => answerAt(i));
  const answeredCount = answers.filter((a) => a !== undefined).length;
  const firstOpen = answers.findIndex((a) => a === undefined);
  const allAnswered = total > 0 && firstOpen === -1;

  const [view, setView] = useState<View>(() =>
    firstOpen === -1 && total > 0 ? "result" : Math.max(0, firstOpen),
  );
  // Shown only once every question is answered; a question asked again by
  // a rolled-back answer, say, is shown instead.
  const shown: View = view === "result" && !allAnswered ? Math.max(0, firstOpen) : view;

  // ── The section's gate, for every question of the group ──────────────────
  const completion = useLessonCompletion();
  const completionRef = useRef(completion);
  completionRef.current = completion;
  // The same array while the questions are the same, for the effects below.
  const idsKey = ids.map((id) => id ?? "").join("\n");
  const stableIds = useMemo(() => idsKey.split("\n"), [idsKey]);
  useEffect(() => {
    const registered = stableIds.filter((id) => id !== "");
    for (const id of registered) completionRef.current?.register(id);
    return () => {
      for (const id of registered) completionRef.current?.unregister(id);
    };
  }, [stableIds]);

  // Answered and on record is done: now, or before the section was last on screen.
  const doneKey = ids.map((id, i) => (id !== undefined && confirmedAt(i) ? id : "")).join("\n");
  useEffect(() => {
    for (const id of doneKey.split("\n")) {
      if (id !== "") completionRef.current?.markDone(id);
    }
  }, [doneKey]);

  // ── Moving between questions ─────────────────────────────────────────────
  const groupRef = useRef<HTMLDivElement>(null);
  /** Set by a move the learner asked for: focus follows it, and it fades in. */
  const movedRef = useRef(false);
  const [moves, setMoves] = useState(0);

  // "Question suivante" pressed while the server still had the answer to
  // confirm: the learner goes on as soon as it is, and stays, with the
  // reason said, if it is refused.
  const [queued, setQueued] = useState<View | null>(null);

  const goTo = useCallback((target: View) => {
    movedRef.current = true;
    setQueued(null);
    setMoves((n) => n + 1);
    setView(target);
  }, []);

  // The new question, or the result, takes the focus: a keyboard or
  // screen-reader user starts reading it, not a button that is gone. And if
  // the learner had scrolled down to the explanation, its top comes back
  // into view, below the lesson's toolbar (the page's scroll-padding-top).
  useLayoutEffect(() => {
    if (!movedRef.current) return;
    movedRef.current = false;
    const group = groupRef.current;
    if (!group) return;
    const toolbar = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    if (group.getBoundingClientRect().top < toolbar) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      group.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }
    group.querySelector<HTMLElement>("[data-quiz-stage] h3")?.focus({ preventScroll: true });
  }, [moves]);

  // "Revoir ce passage" names a question by the address's fragment
  // (`#quiz-<id>`, revisions/passage.ts). Only the question on screen is in
  // the page, so the group puts the one asked for there, then brings it into
  // view: on opening, and when a passage is asked for over the lesson already
  // on screen (`?section=`, which the stepper reads, then takes off).
  const requestedSection = useSearchParamsOutsideRouter()?.get(SECTION_PARAM) ?? null;
  const [passage, setPassage] = useState<number | null>(null);
  useEffect(() => {
    const fragment = window.location.hash.slice(1);
    if (fragment === "") return;
    let target: string;
    try {
      target = decodeURIComponent(fragment);
    } catch {
      target = fragment;
    }
    const index = stableIds.findIndex((id) => id !== "" && quizAnchor(id) === target);
    if (index === -1) return;
    setView(index);
    setPassage(index);
  }, [requestedSection, stableIds]);
  useEffect(() => {
    if (passage === null) return;
    setPassage(null);
    const id = stableIds[passage];
    if (id === undefined || id === "") return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById(quizAnchor(id))
      ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, [passage, stableIds]);

  const shownConfirmed = typeof shown === "number" && confirmedAt(shown);
  const shownAnswered = typeof shown === "number" && answerAt(shown) !== undefined;
  useEffect(() => {
    if (queued === null) return;
    if (shownConfirmed) {
      setQueued(null);
      goTo(queued);
    } else if (!shownAnswered) {
      setQueued(null);
    }
  }, [queued, shownConfirmed, shownAnswered, goTo]);

  /** Where an answered question leads, and what the button says. */
  function nextOf(i: number): { target: View; label: string } {
    if (i < total - 1) return { target: i + 1, label: "Question suivante" };
    if (allAnswered) return { target: "result", label: "Voir mon résultat" };
    return { target: Math.max(0, firstOpen), label: "Reprendre le quiz" };
  }

  const stage = (() => {
    if (shown === "result") {
      return (
        <QuizResult
          items={items}
          answers={answers}
          onReview={(i) => {
            goTo(i);
          }}
        />
      );
    }
    const child = items[shown];
    if (!child) return null;
    const answered = answers[shown] !== undefined;
    const way = nextOf(shown);
    return React.cloneElement(child, {
      key: shown,
      questionNumber: shown + 1,
      questionCount: total,
      next: answered
        ? {
            // Said while the answer is on its way: the press was heard.
            label: queued !== null ? "Enregistrement de ta réponse…" : way.label,
            waiting: queued !== null,
            onSelect: () => {
              if (confirmedAt(shown)) goTo(way.target);
              else setQueued(way.target);
            },
          }
        : undefined,
      ...(lessonQuiz
        ? {}
        : {
            localAnswer: localAnswers[shown],
            onAnswered: (answer: QuizAnswer) => {
              setLocalAnswers((prev) => (prev[shown] ? prev : { ...prev, [shown]: answer }));
            },
          }),
    });
  })();

  return (
    <div ref={groupRef} className="cl-quiz-group">
      <div className="cl-quiz-progress" role="group" aria-label="Progression du quiz">
        <ol className="cl-quiz-steps">
          {items.map((child, i) => {
            const answer = answers[i];
            const state =
              answer !== undefined
                ? answer.correct
                  ? "right"
                  : "wrong"
                : i === firstOpen
                  ? "current"
                  : "ahead";
            const reachable = answer !== undefined || i === firstOpen;
            const status =
              state === "right"
                ? "bonne réponse"
                : state === "wrong"
                  ? "mauvaise réponse"
                  : state === "current"
                    ? "à répondre"
                    : "pas encore ouverte";
            return (
              <li key={child.props.id ?? i}>
                <button
                  type="button"
                  className="cl-quiz-step"
                  data-state={state}
                  aria-current={shown === i ? "step" : undefined}
                  aria-label={`Question ${String(i + 1)} : ${status}`}
                  disabled={!reachable}
                  onClick={() => {
                    if (shown !== i) goTo(i);
                  }}
                >
                  <span aria-hidden="true">{i + 1}</span>
                  {state === "right" && <span aria-hidden="true">✓</span>}
                  {state === "wrong" && <span aria-hidden="true">✗</span>}
                </button>
              </li>
            );
          })}
          {allAnswered && (
            <li className="cl-quiz-steps-result">
              <button
                type="button"
                className="cl-quiz-step"
                data-state="result"
                aria-current={shown === "result" ? "step" : undefined}
                onClick={() => {
                  if (shown !== "result") goTo("result");
                }}
              >
                Résultat
              </button>
            </li>
          )}
        </ol>
        <p className="cl-quiz-count">
          <span aria-hidden="true">
            <strong>{answeredCount}</strong> / {total}
          </span>
          <span className="sr-only">
            {`${String(answeredCount)} question${answeredCount > 1 ? "s" : ""} répondue${answeredCount > 1 ? "s" : ""} sur ${String(total)}`}
          </span>
        </p>
      </div>

      {/* The questions share the group's block (quiz-block.tsx). */}
      <InQuizGroup.Provider value={true}>
        <div
          key={moves}
          data-quiz-stage=""
          className="cl-quiz-stage"
          data-enter={moves > 0 ? "" : undefined}
        >
          {stage}
        </div>
      </InQuizGroup.Provider>
    </div>
  );
}

/**
 * The end of the quiz: the score, the questions missed, each a way back to
 * itself. The completion of the lesson, which follows the last answer of its
 * final quiz (lesson-stepper.tsx), says the rest.
 */
function QuizResult({
  items,
  answers,
  onReview,
}: {
  items: readonly React.ReactElement<QuizChildProps>[];
  answers: readonly (QuizAnswer | undefined)[];
  onReview: (index: number) => void;
}): React.ReactElement {
  const total = items.length;
  const right = answers.filter((a) => a?.correct === true).length;
  const missed = items
    .map((child, i) => ({ index: i, question: child.props.question ?? "", answer: answers[i] }))
    .filter((q) => q.answer !== undefined && !q.answer.correct);

  return (
    <section className="cl-quiz-result" aria-label="Résultat du quiz">
      <h3 className="cl-quiz-result-title" tabIndex={-1}>
        Quiz terminé
      </h3>
      <p className="cl-quiz-score">
        <strong>{right}</strong>
        <span>
          {" / "}
          {total} bonne{right > 1 ? "s" : ""} réponse{right > 1 ? "s" : ""}
        </span>
      </p>
      {missed.length === 0 ? (
        <p className="cl-quiz-result-text">Aucune erreur : chaque question est juste.</p>
      ) : (
        <>
          <p className="cl-quiz-result-text">
            {missed.length === 1 ? "La question à relire :" : "Les questions à relire :"}
          </p>
          <ul className="cl-quiz-missed">
            {missed.map((q) => (
              <li key={q.index}>
                <button
                  type="button"
                  onClick={() => {
                    onReview(q.index);
                  }}
                >
                  <span className="cl-quiz-missed-number">{`Question ${String(q.index + 1)}`}</span>
                  <span className="cl-quiz-missed-text">{q.question}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
