"use client";

import React, { useEffect, useRef, useState } from "react";
import { useLessonCompletion } from "./lesson-completion-context";
import { useLessonQuiz, type QuizAnswer } from "./lesson-quiz-context";

/**
 * One question, one answer.
 *
 * A wrong answer used to be retried until it was right, so every lesson ended
 * the same whatever the learner knew, and a quiz inside a group folded away
 * once answered while a quiz on its own stayed open. Now:
 *
 *  - the first answer is the answer: it is recorded on the server, which
 *    decides whether it is right, and it cannot be changed;
 *  - an answered quiz stays open, grouped or not, showing the right option and
 *    the explanation when the author wrote one;
 *  - answering, right or wrong, is what lets the section go on.
 *
 * Outside a lesson page (an editor preview) there is no record to write to,
 * and the quiz scores itself locally.
 *
 * On a lesson page the options are shown in an order of the learner's own
 * (see quizOptionOrder): authors put the right answer second in most quizzes.
 * Only the display moves. The index sent, stored and compared is the option's
 * written index; the letters follow the display. A preview keeps the written
 * order, which is what its author is checking.
 */

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
  /** Injected by QuizGroup: called once, when this question is answered. */
  onAnswered?: (answer: QuizAnswer) => void;
}

const LETTER = ["A", "B", "C", "D", "E", "F"];
const RED = "#FF4757";

export function Quiz({
  id,
  question,
  options,
  choices,
  correct,
  explanation,
  questionNumber,
  questionCount,
  onAnswered,
}: QuizProps): React.ReactElement {
  const items = options ?? choices ?? [];
  const lessonQuiz = useLessonQuiz();
  const [picked, setPicked] = useState<number | null>(null);
  const [localAnswer, setLocalAnswer] = useState<QuizAnswer | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answer = lessonQuiz ? (lessonQuiz.answers[id] ?? null) : localAnswer;
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
  const onAnsweredRef = useRef(onAnswered);
  onAnsweredRef.current = onAnswered;

  useEffect(() => {
    completionRef.current?.register(id);
    return () => {
      completionRef.current?.unregister(id);
    };
  }, [id]);

  // Answered - now, or before this section was last on screen - is done.
  useEffect(() => {
    if (answer === null) return;
    completionRef.current?.markDone(id);
    onAnsweredRef.current?.(answer);
  }, [answer, id]);

  async function validate(): Promise<void> {
    if (picked === null || answered || pending) return;
    if (!lessonQuiz) {
      setLocalAnswer({ selected: picked, correct: picked === correct });
      return;
    }
    setPending(true);
    setError(null);
    const result = await lessonQuiz.submit(id, picked);
    setPending(false);
    if (!result.ok) setError(result.error);
  }

  const chosen = answered ? answer.selected : picked;
  const isCorrect = answered && answer.correct;
  const rightOption = items[correct];
  const verdictText = explanation?.trim()
    ? explanation.trim()
    : !isCorrect && rightOption !== undefined
      ? `La bonne réponse était ${letterOf(correct)} : ${rightOption}.`
      : null;

  return (
    <section
      aria-label={questionNumber !== undefined ? `Question ${String(questionNumber)}` : "Question"}
      style={{
        margin: questionNumber !== undefined ? "0" : "56px 0 0",
        padding: "32px 32px 28px",
        border: "1px solid #1F1B47",
        background: "rgba(10,8,38,0.5)",
        position: "relative",
      }}
    >
      {/* Top gradient border accent */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          padding: 1,
          background: "linear-gradient(135deg, rgba(0,36,255,0.4), transparent 50%)",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--cosmetic-accent)",
          }}
        >
          › Vérification
          {questionNumber !== undefined && questionCount !== undefined && (
            <span style={{ color: "#44406B" }}>
              {" · Question "}
              {questionNumber}/{questionCount}
            </span>
          )}
        </span>
        <span
          role={answered ? "status" : undefined}
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {answered &&
            (isCorrect ? (
              <span style={{ color: "var(--cosmetic-accent)" }}>✓ Bonne réponse</span>
            ) : (
              <span style={{ color: RED }}>✗ Mauvaise réponse</span>
            ))}
        </span>
      </div>

      {/* Question */}
      <h3
        style={{
          fontFamily: "var(--font-display, sans-serif)",
          fontWeight: 700,
          fontSize: 24,
          lineHeight: 1.25,
          letterSpacing: "-0.015em",
          color: "#F5F5FA",
          margin: "0 0 24px",
        }}
      >
        {question}
      </h3>

      {/* Choices */}
      <div
        role="radiogroup"
        aria-label={question}
        style={{ display: "flex", flexDirection: "column", gap: 0 }}
      >
        {order.map((i, position) => {
          const choice = items[i] ?? "";
          const isChosen = chosen === i;
          const isThisCorrect = answered && i === correct;
          const isThisWrong = answered && isChosen && i !== correct;

          let borderLeftColor = "#1F1B47";
          let bg = "rgba(5,4,26,0.5)";
          let textColor = "#B8B5D1";
          let letterColor = "#3F3D5C";
          let stateLabel = "";

          if (isThisCorrect) {
            borderLeftColor = "var(--cosmetic-accent)";
            bg =
              "linear-gradient(90deg, color-mix(in srgb, var(--cosmetic-accent) 8%, transparent), transparent 60%)";
            textColor = "#F5F5FA";
            letterColor = "var(--cosmetic-accent)";
            stateLabel = isChosen ? "Ton choix · bonne réponse" : "Bonne réponse";
          } else if (isThisWrong) {
            borderLeftColor = RED;
            bg = "linear-gradient(90deg, rgba(255,71,87,0.08), transparent 60%)";
            textColor = "#F5F5FA";
            letterColor = RED;
            stateLabel = "Ton choix";
          } else if (isChosen && !answered) {
            borderLeftColor = "#0024FF";
            bg = "linear-gradient(90deg, rgba(0,36,255,0.1), transparent 60%)";
            textColor = "#F5F5FA";
            letterColor = "#6E8BFF";
          } else if (answered) {
            textColor = "#6B6890";
          }

          const locked = answered || pending;
          return (
            <label
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "40px 24px 1fr auto",
                alignItems: "center",
                gap: 16,
                padding: "16px 20px",
                border: "1px solid #1F1B47",
                borderLeft: `3px solid ${borderLeftColor}`,
                background: bg,
                cursor: locked ? "default" : "pointer",
                fontFamily: "var(--font-body, sans-serif)",
                fontSize: 14,
                color: textColor,
                transition: "all 180ms ease",
                marginBottom: 8,
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!locked && !isChosen) {
                  e.currentTarget.style.borderColor = "#2A2560";
                  e.currentTarget.style.background =
                    "color-mix(in srgb, var(--cosmetic-accent) 2%, transparent)";
                  e.currentTarget.style.color = "#F5F5FA";
                }
              }}
              onMouseLeave={(e) => {
                if (!locked && !isChosen) {
                  e.currentTarget.style.borderColor = "#1F1B47";
                  e.currentTarget.style.borderLeftColor = "#1F1B47";
                  e.currentTarget.style.background = "rgba(5,4,26,0.5)";
                  e.currentTarget.style.color = "#B8B5D1";
                }
              }}
            >
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
                disabled={locked}
              />
              {/* Letter */}
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: letterColor,
                  letterSpacing: "0.1em",
                }}
              >
                {LETTER[position]}
              </span>
              {/* Radio indicator */}
              <span
                aria-hidden="true"
                style={{
                  width: 14,
                  height: 14,
                  border: `1.5px solid ${isChosen || isThisCorrect ? borderLeftColor : "#2A2560"}`,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  background: isThisCorrect ? "var(--cosmetic-accent)" : "transparent",
                  flexShrink: 0,
                }}
              >
                {isThisCorrect && (
                  <svg viewBox="0 0 12 12" width={8} height={8} fill="none">
                    <path
                      d="M2.5 6.5 L5 9 L9.5 3.5"
                      stroke="#030219"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {isChosen && !answered && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#0024FF",
                      boxShadow: "0 0 8px rgba(0,36,255,0.7)",
                    }}
                  />
                )}
              </span>
              {/* Choice text */}
              <span>{choice}</span>
              {/* State label */}
              {stateLabel !== "" && (
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: isThisCorrect ? "var(--cosmetic-accent)" : RED,
                    whiteSpace: "nowrap",
                  }}
                >
                  {stateLabel}
                </span>
              )}
            </label>
          );
        })}
      </div>

      {answered ? (
        verdictText !== null && (
          <div
            style={{
              marginTop: 16,
              padding: "14px 18px",
              borderLeft: `3px solid ${isCorrect ? "var(--cosmetic-accent)" : RED}`,
              background: isCorrect
                ? "color-mix(in srgb, var(--cosmetic-accent) 5%, transparent)"
                : "rgba(255,71,87,0.05)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: isCorrect ? "var(--cosmetic-accent)" : RED,
                marginBottom: 6,
              }}
            >
              {explanation?.trim() ? "Pourquoi" : "Correction"}
            </div>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-body, sans-serif)",
                fontSize: 14,
                lineHeight: 1.6,
                color: "#B8B5D1",
              }}
            >
              {verdictText}
            </p>
          </div>
        )
      ) : (
        <>
          <button
            type="button"
            disabled={picked === null || pending}
            onClick={() => {
              void validate();
            }}
            style={{
              display: "block",
              width: "100%",
              marginTop: 16,
              padding: "18px 24px",
              fontFamily: "var(--font-mono, monospace)",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              background: picked === null ? "rgba(30,27,71,0.5)" : "#0024FF",
              color: picked === null ? "#3F3D5C" : "#ffffff",
              border: picked === null ? "1px solid #2A2560" : "1px solid #0024FF",
              cursor: picked === null ? "not-allowed" : pending ? "wait" : "pointer",
              transition: "all 180ms ease",
              boxShadow:
                picked === null
                  ? "none"
                  : "0 0 24px rgba(0,36,255,0.25), inset 0 0 0 1px rgba(255,255,255,0.15)",
            }}
          >
            {pending ? "Enregistrement…" : "Valider la réponse"}
          </button>
          <div
            role={error !== null ? "alert" : undefined}
            style={{
              margin: "10px 0 0",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 11,
              letterSpacing: "0.04em",
              color: error !== null ? RED : "#44406B",
            }}
          >
            {error ?? "Une seule réponse par question : elle compte dans ta note de la leçon."}
          </div>
        </>
      )}
    </section>
  );
}
