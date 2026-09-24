"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { quizOptionOrder, quizOrderSeed } from "@cyberlearn/lib/quiz/option-order";
import { answerQuiz } from "../_actions/answer-quiz";
import { reportQuizAction } from "../_actions/report-quiz";

/**
 * The lesson's quiz answers, shared by every quiz on the page.
 *
 * Held here rather than in each Quiz because a section that is not on screen
 * is unmounted: an answer kept in the component was forgotten on the way to
 * the next section and back, and the question asked again. The page passes
 * the answers already on record, so a reload shows them too.
 */

export interface QuizAnswer {
  selected: number;
  correct: boolean;
}

export type SubmitResult = { ok: true; answer: QuizAnswer } | { ok: false; error: string };

export interface LessonQuizContextValue {
  answers: Readonly<Record<string, QuizAnswer>>;
  submit: (quizId: string, selected: number) => Promise<SubmitResult>;
  /**
   * The written indices of a quiz's options, in the order this learner sees
   * them. The same on every visit and in the mobile app; see quizOptionOrder.
   */
  optionOrder: (quizId: string, options: readonly string[]) => number[];
  /** Questions of this lesson the learner reported, not yet closed by the team. */
  reported: ReadonlySet<string>;
  report: (quizId: string, reason: string, comment: string) => Promise<ReportResult>;
}

export type ReportResult = { ok: true } | { ok: false; error: string };

const LessonQuizContext = createContext<LessonQuizContextValue | null>(null);

/** Null outside a lesson page (an editor preview): the quiz then scores locally. */
export function useLessonQuiz(): LessonQuizContextValue | null {
  return useContext(LessonQuizContext);
}

export function LessonQuizProvider({
  lessonId,
  userId,
  initialAnswers,
  initialReported = [],
  children,
}: {
  lessonId: string;
  /** Seeds the order of the options, per learner. */
  userId: string;
  initialAnswers: Record<string, QuizAnswer>;
  /** Questions the learner already reported (open reports). */
  initialReported?: readonly string[];
  children: React.ReactNode;
}): React.ReactElement {
  const [answers, setAnswers] = useState<Record<string, QuizAnswer>>(initialAnswers);

  const submit = useCallback(
    async (quizId: string, selected: number): Promise<SubmitResult> => {
      try {
        const result = await answerQuiz(lessonId, quizId, selected);
        if (!result.ok) return { ok: false, error: result.error };
        // The server's answer, which is an earlier one if there was: a second
        // tab cannot make this page show a different verdict than the record.
        const answer = { selected: result.selected, correct: result.correct };
        setAnswers((prev) => ({ ...prev, [quizId]: answer }));
        return { ok: true, answer };
      } catch {
        return { ok: false, error: "Ta réponse n'a pas pu être enregistrée. Réessaie." };
      }
    },
    [lessonId],
  );

  const optionOrder = useCallback(
    (quizId: string, options: readonly string[]) =>
      quizOptionOrder(options, quizOrderSeed(userId, lessonId, quizId)),
    [userId, lessonId],
  );

  const [reported, setReported] = useState<ReadonlySet<string>>(() => new Set(initialReported));

  const report = useCallback(
    async (quizId: string, reason: string, comment: string): Promise<ReportResult> => {
      try {
        const result = await reportQuizAction({ lessonId, quizId, reason, comment });
        if (result.ok) setReported((prev) => new Set(prev).add(quizId));
        return result;
      } catch {
        return { ok: false, error: "Le signalement n'a pas pu être envoyé. Réessaie." };
      }
    },
    [lessonId],
  );

  const value = useMemo(
    () => ({ answers, submit, optionOrder, reported, report }),
    [answers, submit, optionOrder, reported, report],
  );
  return <LessonQuizContext.Provider value={value}>{children}</LessonQuizContext.Provider>;
}
