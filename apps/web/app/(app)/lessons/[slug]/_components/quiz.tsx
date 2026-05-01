"use client";

import React, { useEffect, useReducer } from "react";
import { useLessonCompletion } from "./lesson-completion-context";

interface QuizProps {
  id: string;
  question: string;
  choices: string[];
  correct: number;
  questionNumber?: number;
  questionCount?: number;
}

interface QuizState {
  selected: number | null;
  submitted: boolean;
}

type QuizAction = { type: "select"; index: number } | { type: "submit" } | { type: "reset" };

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "select":
      if (state.submitted) return state;
      return { ...state, selected: action.index };
    case "submit":
      if (state.selected === null) return state;
      return { ...state, submitted: true };
    case "reset":
      return { selected: null, submitted: false };
    default:
      return state;
  }
}

const LETTER = ["A", "B", "C", "D", "E", "F"];

export function Quiz({
  id,
  question,
  choices,
  correct,
  questionNumber,
  questionCount,
}: QuizProps): React.ReactElement {
  const [state, dispatch] = useReducer(quizReducer, { selected: null, submitted: false });
  const completion = useLessonCompletion();

  useEffect(() => {
    if (!completion) return;
    completion.register(id);
    return () => {
      completion.unregister(id);
    };
  }, [id, completion]);

  useEffect(() => {
    if (state.submitted && state.selected === correct) {
      completion?.markDone(id);
    }
  }, [state.submitted, state.selected, correct, id, completion]);

  const isCorrect = state.submitted && state.selected === correct;
  const isWrong = state.submitted && state.selected !== correct;

  return (
    <section
      style={{
        margin: "56px 0 0",
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
            color: "#0AFFD4",
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
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {isCorrect && <span style={{ color: "#0AFFD4" }}>✓ Correct</span>}
          {isWrong && <span style={{ color: "#FF4757" }}>✗ Incorrect — réessaye</span>}
          {!state.submitted && questionNumber !== undefined && questionCount !== undefined && (
            <span style={{ color: "#44406B" }}>
              {String(questionNumber).padStart(2, "0")}/{String(questionCount).padStart(2, "0")}
            </span>
          )}
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
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {choices.map((choice, i) => {
          const isSelected = state.selected === i;
          const isThisCorrect = state.submitted && i === correct;
          const isThisWrong = state.submitted && isSelected && i !== correct;

          let borderLeftColor = "#1F1B47";
          let bg = "rgba(5,4,26,0.5)";
          let textColor = "#B8B5D1";
          let letterColor = "#3F3D5C";
          let stateLabel = "—";

          if (isThisCorrect) {
            borderLeftColor = "#0AFFD4";
            bg = "linear-gradient(90deg, rgba(10,255,212,0.08), transparent 60%)";
            textColor = "#F5F5FA";
            letterColor = "#0AFFD4";
            stateLabel = "Bonne réponse";
          } else if (isThisWrong) {
            borderLeftColor = "#FF4757";
            bg = "linear-gradient(90deg, rgba(255,71,87,0.08), transparent 60%)";
            textColor = "#F5F5FA";
            letterColor = "#FF4757";
            stateLabel = "Ton choix";
          } else if (isSelected && !state.submitted) {
            borderLeftColor = "#0024FF";
            bg = "linear-gradient(90deg, rgba(0,36,255,0.1), transparent 60%)";
            textColor = "#F5F5FA";
            letterColor = "#6E8BFF";
            stateLabel = "Sélectionné";
          }

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
                cursor: state.submitted ? "default" : "pointer",
                fontFamily: "var(--font-body, sans-serif)",
                fontSize: 14,
                color: textColor,
                transition: "all 180ms ease",
                marginBottom: 8,
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!state.submitted && !isSelected) {
                  e.currentTarget.style.borderColor = "#2A2560";
                  e.currentTarget.style.background = "rgba(10,255,212,0.02)";
                  e.currentTarget.style.color = "#F5F5FA";
                }
              }}
              onMouseLeave={(e) => {
                if (!state.submitted && !isSelected) {
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
                checked={isSelected}
                onChange={() => {
                  dispatch({ type: "select", index: i });
                }}
                style={{ display: "none" }}
                disabled={state.submitted}
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
                {LETTER[i]}
              </span>
              {/* Radio indicator */}
              <span
                style={{
                  width: 14,
                  height: 14,
                  border: `1.5px solid ${isSelected || isThisCorrect ? borderLeftColor : "#2A2560"}`,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  background: isThisCorrect ? "#0AFFD4" : "transparent",
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
                {isSelected && !state.submitted && (
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
              {state.submitted && (
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: isThisCorrect ? "#0AFFD4" : isThisWrong ? "#FF4757" : "#3F3D5C",
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

      {/* Submit / retry button */}
      {!state.submitted ? (
        <button
          type="button"
          disabled={state.selected === null}
          onClick={() => {
            dispatch({ type: "submit" });
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
            background: state.selected === null ? "rgba(30,27,71,0.5)" : "#0024FF",
            color: state.selected === null ? "#3F3D5C" : "#ffffff",
            border: state.selected === null ? "1px solid #2A2560" : "1px solid #0024FF",
            cursor: state.selected === null ? "not-allowed" : "pointer",
            transition: "all 180ms ease",
            boxShadow:
              state.selected === null
                ? "none"
                : "0 0 24px rgba(0,36,255,0.25), inset 0 0 0 1px rgba(255,255,255,0.15)",
          }}
          onMouseEnter={(e) => {
            if (state.selected !== null) e.currentTarget.style.background = "#1F3BFF";
          }}
          onMouseLeave={(e) => {
            if (state.selected !== null) e.currentTarget.style.background = "#0024FF";
          }}
        >
          Valider la réponse
        </button>
      ) : isWrong ? (
        <button
          type="button"
          onClick={() => {
            dispatch({ type: "reset" });
          }}
          style={{
            display: "block",
            width: "100%",
            marginTop: 16,
            padding: "14px 24px",
            fontFamily: "var(--font-mono, monospace)",
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            background: "transparent",
            color: "#FF4757",
            border: "1px solid rgba(255,71,87,0.4)",
            cursor: "pointer",
            transition: "all 180ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,71,87,0.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          Réessayer
        </button>
      ) : null}
    </section>
  );
}
