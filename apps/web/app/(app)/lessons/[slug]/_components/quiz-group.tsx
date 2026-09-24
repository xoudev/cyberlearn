"use client";

import React, { useState } from "react";
import { useLessonQuiz, type QuizAnswer } from "./lesson-quiz-context";

interface QuizGroupProps {
  children: React.ReactNode;
}

interface QuizChildProps {
  id?: string;
  onAnswered?: (answer: QuizAnswer) => void;
  questionNumber?: number;
  questionCount?: number;
}

/**
 * A series of questions, asked one after another.
 *
 * The next question appears once the current one is answered, right or
 * wrong: a wrong answer is explained, not retried. Answered questions stay
 * open, as a quiz on its own does. They used to fold into a one-line summary,
 * which hid the explanation and made grouped and single quizzes behave
 * differently for no reason a learner could see.
 */
export function QuizGroup({ children }: QuizGroupProps): React.ReactElement {
  const lessonQuiz = useLessonQuiz();
  // SAFETY: the group's children are the <Quiz> elements the author wrote.
  const items = React.Children.toArray(children).filter(
    React.isValidElement,
  ) as React.ReactElement<QuizChildProps>[];
  const total = items.length;

  // Without a lesson record (an editor preview), answers are kept here.
  const [localAnswers, setLocalAnswers] = useState<Record<number, QuizAnswer>>({});

  const answerAt = (i: number): QuizAnswer | undefined => {
    const id = items[i]?.props.id;
    if (lessonQuiz) return id === undefined ? undefined : lessonQuiz.answers[id];
    return localAnswers[i];
  };

  // Every question up to the first unanswered one is shown.
  let shown = 0;
  while (shown < total && answerAt(shown) !== undefined) shown++;
  const visible = Math.min(total, shown + 1);
  const answeredCount = shown;

  return (
    <div style={{ margin: "56px 0 0" }}>
      {/* Step progress dots: green right, red wrong, blue current. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 24,
          fontFamily: "var(--font-mono, monospace)",
        }}
      >
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#44406B",
            marginRight: 4,
          }}
        >
          Vérification
        </span>
        {items.map((_, i) => {
          const answer = answerAt(i);
          const isActive = answer === undefined && i === shown;
          return (
            <span
              key={i}
              aria-hidden="true"
              style={{
                display: "inline-block",
                width: answer !== undefined ? 20 : isActive ? 8 : 6,
                height: 6,
                borderRadius: 999,
                background:
                  answer !== undefined
                    ? answer.correct
                      ? "var(--cosmetic-accent)"
                      : "#FF4757"
                    : isActive
                      ? "#0024FF"
                      : "#2A2560",
                boxShadow: isActive ? "0 0 8px rgba(0,36,255,0.6)" : "none",
                transition: "all 300ms ease",
              }}
            />
          );
        })}
        <span style={{ fontSize: 10, color: "#44406B", marginLeft: 4 }}>
          {answeredCount}/{total}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.slice(0, visible).map((child, i) =>
          React.cloneElement(child, {
            key: i,
            questionNumber: i + 1,
            questionCount: total,
            ...(lessonQuiz
              ? {}
              : {
                  onAnswered: (answer: QuizAnswer) => {
                    setLocalAnswers((prev) => (prev[i] ? prev : { ...prev, [i]: answer }));
                  },
                }),
          }),
        )}
      </div>
    </div>
  );
}
