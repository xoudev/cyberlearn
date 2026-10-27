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
 *
 * An answer shows at once. The page already holds the answer key (the Quiz's
 * `correct` prop), so the verdict is drawn from it while the server records
 * the answer, and the server's record replaces it when it comes back: the
 * learner used to wait for the whole round trip, a second or more, staring at
 * "Enregistrement…". The record still wins: if the server kept an earlier
 * answer (a second tab), that one is shown; if it refused, the answer is taken
 * back and the reason said. Until it is confirmed an answer is `unconfirmed`,
 * and nothing that counts (the section's gate, the lesson's completion) is
 * moved by it.
 */

export interface QuizAnswer {
  selected: number;
  correct: boolean;
}

export type SubmitResult = { ok: true; answer: QuizAnswer } | { ok: false; error: string };

export interface LessonQuizContextValue {
  /** Every answer shown: on record, or sent and not confirmed yet. */
  answers: Readonly<Record<string, QuizAnswer>>;
  /** The answers sent and not confirmed by the server yet. */
  unconfirmed: ReadonlySet<string>;
  /**
   * The questions answered, and confirmed, since this page opened: what the
   * learner did here, as opposed to what the record held already.
   */
  answeredNow: ReadonlySet<string>;
  /**
   * Sends an answer. `expected` is the verdict the page draws until the
   * server's comes back: whether `selected` is the option the quiz names right.
   */
  submit: (quizId: string, selected: number, expected: boolean) => Promise<SubmitResult>;
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

const NOT_SAVED = "Ta réponse n'a pas pu être enregistrée. Réessaie.";

function withId(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
  return set.has(id) ? set : new Set(set).add(id);
}

function withoutId(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
  if (!set.has(id)) return set;
  const next = new Set(set);
  next.delete(id);
  return next;
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
  const [unconfirmed, setUnconfirmed] = useState<ReadonlySet<string>>(() => new Set());
  const [answeredNow, setAnsweredNow] = useState<ReadonlySet<string>>(() => new Set());

  const submit = useCallback(
    async (quizId: string, selected: number, expected: boolean): Promise<SubmitResult> => {
      // Shown now, as the page scores it. An answer on record is never
      // replaced: the quiz does not offer to answer twice, and a click that
      // got through anyway is the server's to settle.
      setAnswers((prev) =>
        prev[quizId] ? prev : { ...prev, [quizId]: { selected, correct: expected } },
      );
      setUnconfirmed((prev) => withId(prev, quizId));

      const takeBack = (): void => {
        setAnswers((prev) =>
          quizId in prev
            ? Object.fromEntries(Object.entries(prev).filter(([id]) => id !== quizId))
            : prev,
        );
        setUnconfirmed((prev) => withoutId(prev, quizId));
      };

      let result: Awaited<ReturnType<typeof answerQuiz>>;
      try {
        result = await answerQuiz(lessonId, quizId, selected);
      } catch {
        takeBack();
        return { ok: false, error: NOT_SAVED };
      }
      if (!result.ok) {
        takeBack();
        return { ok: false, error: result.error };
      }
      // The server's answer, which is an earlier one if there was: a second
      // tab cannot make this page show a different verdict than the record.
      const answer = { selected: result.selected, correct: result.correct };
      setAnswers((prev) => ({ ...prev, [quizId]: answer }));
      setUnconfirmed((prev) => withoutId(prev, quizId));
      setAnsweredNow((prev) => withId(prev, quizId));
      return { ok: true, answer };
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
    () => ({ answers, unconfirmed, answeredNow, submit, optionOrder, reported, report }),
    [answers, unconfirmed, answeredNow, submit, optionOrder, reported, report],
  );
  return <LessonQuizContext.Provider value={value}>{children}</LessonQuizContext.Provider>;
}
