"use client";

import React, { useId, useState } from "react";
import {
  QUIZ_REPORT_COMMENT_MAX,
  QUIZ_REPORT_REASON_KEYS,
  QUIZ_REPORT_REASON_LABELS,
  type QuizReportReasonKey,
} from "@cyberlearn/lib/quiz/report-reasons";
import { useLessonQuiz } from "./lesson-quiz-context";

/**
 * "Signaler cette question", under a lesson quiz.
 *
 * With one answer per question, an ambiguous one costs a point for nothing,
 * and the team never heard of it. The report goes to the console, grouped by
 * question. Only on a lesson page: an editor preview has nobody to report to.
 */

const MUTED = "#6B6890";
const RED = "#FF4757";

const linkStyle: React.CSSProperties = {
  background: "none",
  border: 0,
  padding: "6px 0",
  minHeight: 32,
  cursor: "pointer",
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 10.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: MUTED,
  textDecoration: "underline",
  textUnderlineOffset: 3,
};

export function QuizReport({ quizId }: { quizId: string }): React.ReactElement | null {
  const lessonQuiz = useLessonQuiz();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<QuizReportReasonKey | null>(null);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);

  if (!lessonQuiz) return null;
  const reported = lessonQuiz.reported.has(quizId);

  async function send(): Promise<void> {
    if (!lessonQuiz || reason === null || pending) return;
    setPending(true);
    setError(null);
    const result = await lessonQuiz.report(quizId, reason, comment.trim());
    setPending(false);
    if (result.ok) {
      setOpen(false);
      setJustSent(true);
    } else {
      setError(result.error);
    }
  }

  if (!open) {
    return (
      <div
        style={{
          marginTop: 12,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 12,
        }}
      >
        {reported ? (
          <span
            role={justSent ? "status" : undefined}
            style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: 13, color: "#B8B5D1" }}
          >
            {justSent
              ? "Merci, c'est signalé. L'équipe va relire cette question."
              : "Tu as signalé cette question. L'équipe va la relire."}
          </span>
        ) : null}
        <button
          type="button"
          style={linkStyle}
          aria-expanded={false}
          aria-controls={formId}
          onClick={() => {
            setOpen(true);
            setJustSent(false);
          }}
        >
          {reported ? "Modifier le signalement" : "Signaler cette question"}
        </button>
      </div>
    );
  }

  return (
    <fieldset
      id={formId}
      style={{
        margin: "16px 0 0",
        padding: "16px 18px",
        border: "1px solid #2A2560",
        background: "rgba(5,4,26,0.6)",
      }}
    >
      <legend
        style={{
          padding: "0 6px",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 10.5,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#B8B5D1",
        }}
      >
        Qu&apos;est-ce qui ne va pas ?
      </legend>
      <div style={{ display: "grid", gap: 6 }}>
        {QUIZ_REPORT_REASON_KEYS.map((key) => (
          <label
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minHeight: 36,
              padding: "6px 10px",
              cursor: "pointer",
              border: `1px solid ${reason === key ? "var(--cosmetic-accent)" : "#1F1B47"}`,
              background:
                reason === key
                  ? "color-mix(in srgb, var(--cosmetic-accent) 6%, transparent)"
                  : "transparent",
              fontFamily: "var(--font-body, sans-serif)",
              fontSize: 14,
              color: "#F5F5FA",
            }}
          >
            <input
              type="radio"
              name={`report-${quizId}`}
              value={key}
              checked={reason === key}
              onChange={() => {
                setReason(key);
                setError(null);
              }}
            />
            {QUIZ_REPORT_REASON_LABELS[key]}
          </label>
        ))}
      </div>
      <label
        style={{
          display: "block",
          marginTop: 12,
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: MUTED,
        }}
      >
        Précise si tu veux (facultatif)
        <textarea
          value={comment}
          maxLength={QUIZ_REPORT_COMMENT_MAX}
          rows={3}
          onChange={(e) => {
            setComment(e.target.value);
          }}
          style={{
            display: "block",
            width: "100%",
            marginTop: 6,
            padding: "10px 12px",
            resize: "vertical",
            border: "1px solid #2A2560",
            background: "#05041A",
            color: "#F5F5FA",
            fontFamily: "var(--font-body, sans-serif)",
            fontSize: 14,
            lineHeight: 1.5,
            textTransform: "none",
            letterSpacing: "normal",
          }}
        />
      </label>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          marginTop: 12,
        }}
      >
        <button
          type="button"
          disabled={reason === null || pending}
          onClick={() => {
            void send();
          }}
          style={{
            minHeight: 40,
            padding: "0 18px",
            fontFamily: "var(--font-mono, monospace)",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            border: "1px solid #0024FF",
            background: reason === null ? "transparent" : "#0024FF",
            color: reason === null ? "#3F3D5C" : "#FFFFFF",
            cursor: reason === null ? "not-allowed" : pending ? "wait" : "pointer",
          }}
        >
          {pending ? "Envoi…" : "Envoyer"}
        </button>
        <button
          type="button"
          style={linkStyle}
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Annuler
        </button>
        <span style={{ marginLeft: "auto", fontSize: 11, color: MUTED }}>
          {comment.length}/{QUIZ_REPORT_COMMENT_MAX}
        </span>
      </div>
      {error !== null ? (
        <p role="alert" style={{ margin: "10px 0 0", fontSize: 13, color: RED }}>
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
