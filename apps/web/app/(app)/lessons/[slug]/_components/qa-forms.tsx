"use client";

import React, { useState, useTransition } from "react";
import {
  postQuestionAction,
  postAnswerAction,
  acceptAnswerAction,
  upvoteAnswerAction,
} from "../_actions/qa-actions";
import { HELD_FOR_REVIEW } from "@/lib/moderation/held-notice";

// ── Post question form ────────────────────────────────────────────────────────

export function PostQuestionForm({ lessonId }: { lessonId: string }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [held, setHeld] = useState(false);
  const [isPending, startTransition] = useTransition();

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await postQuestionAction(lessonId, title, content);
      if (!res.success) {
        setError(res.error ?? "Erreur.");
        return;
      }
      setTitle("");
      setContent("");
      setOpen(false);
      setHeld(res.heldForReview === true);
    });
  }

  if (!open) {
    return (
      <>
        {held && <HeldNotice />}
        <button
          type="button"
          onClick={() => {
            setOpen(true);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            background: "transparent",
            border: "1px solid #2A2560",
            color: "#B8B5D1",
            cursor: "pointer",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
          Poser une question
        </button>
      </>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "rgba(5,4,26,0.7)",
        border: "1px solid #2A2560",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--cosmetic-accent)",
          marginBottom: 4,
        }}
      >
        {"// Nouvelle question"}
      </div>

      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
        }}
        placeholder="Titre de ta question (10–200 caractères)"
        maxLength={200}
        required
        style={INPUT_STYLE}
      />
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
        }}
        placeholder="Décris ta question en détail (20–5000 caractères)"
        maxLength={5000}
        required
        rows={5}
        style={{ ...INPUT_STYLE, resize: "vertical" }}
      />

      {error && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#FF4757", margin: 0 }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" disabled={isPending} style={BTN_PRIMARY}>
          {isPending ? "Envoi…" : "Publier la question"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
          }}
          style={BTN_GHOST}
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

/** The same sentence the forum shows, in the Q&A's own type. */
function HeldNotice(): React.JSX.Element {
  return (
    <p
      role="status"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        lineHeight: 1.5,
        color: "#FFB547",
        border: "1px solid rgba(255,181,71,0.35)",
        background: "rgba(255,181,71,0.07)",
        padding: "10px 12px",
        margin: "0 0 12px",
      }}
    >
      {HELD_FOR_REVIEW}
    </p>
  );
}

// ── Post answer form ──────────────────────────────────────────────────────────

export function PostAnswerForm({ questionId }: { questionId: string }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [held, setHeld] = useState(false);
  const [isPending, startTransition] = useTransition();

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await postAnswerAction(questionId, content);
      if (!res.success) {
        setError(res.error ?? "Erreur.");
        return;
      }
      setHeld(res.heldForReview === true);
      setContent("");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <>
        {held && <HeldNotice />}
        <button
          type="button"
          onClick={() => {
            setOpen(true);
          }}
          style={{ ...BTN_GHOST, fontSize: 10, padding: "6px 12px" }}
        >
          Répondre
        </button>
      </>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}
    >
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
        }}
        placeholder="Ta réponse (10–5000 caractères)"
        maxLength={5000}
        required
        rows={4}
        style={{ ...INPUT_STYLE, resize: "vertical" }}
      />
      {error && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#FF4757", margin: 0 }}>
          {error}
        </p>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={isPending} style={BTN_PRIMARY}>
          {isPending ? "Envoi…" : "Publier"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
          }}
          style={BTN_GHOST}
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

// ── Accept answer button ──────────────────────────────────────────────────────

export function AcceptAnswerButton({
  answerId,
  lessonSlug,
  isAccepted,
}: { answerId: string; lessonSlug: string; isAccepted: boolean }): React.JSX.Element {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending || isAccepted}
      onClick={() => {
        startTransition(() => {
          void acceptAnswerAction(answerId, lessonSlug);
        });
      }}
      title={isAccepted ? "Réponse acceptée" : "Marquer comme réponse acceptée"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 10px",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        background: isAccepted
          ? "color-mix(in srgb, var(--cosmetic-accent) 12%, transparent)"
          : "transparent",
        border: `1px solid ${isAccepted ? "color-mix(in srgb, var(--cosmetic-accent) 40%, transparent)" : "#2A2560"}`,
        color: isAccepted ? "var(--cosmetic-accent)" : "#7F7BA9",
        cursor: isAccepted ? "default" : "pointer",
      }}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 8L7 12L13 4" />
      </svg>
      {isAccepted ? "Acceptée" : "Accepter"}
    </button>
  );
}

// ── Upvote button ─────────────────────────────────────────────────────────────

export function UpvoteButton({
  answerId,
  lessonSlug,
  upvotes,
}: { answerId: string; lessonSlug: string; upvotes: number }): React.JSX.Element {
  const [count, setCount] = useState(upvotes);
  const [voted, setVoted] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleUpvote() {
    if (voted || isPending) return;
    startTransition(async () => {
      const res = await upvoteAnswerAction(answerId, lessonSlug);
      if (res.success) {
        setCount((c) => c + 1);
        setVoted(true);
      }
    });
  }

  return (
    <button
      type="button"
      disabled={voted || isPending}
      onClick={handleUpvote}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 8px",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        background: "transparent",
        border: `1px solid ${voted ? "rgba(0,36,255,0.4)" : "#1F1B47"}`,
        color: voted ? "#4D8BFF" : "#7F7BA9",
        cursor: voted ? "default" : "pointer",
      }}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 13V3M3 8l5-5 5 5" />
      </svg>
      {count}
    </button>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  background: "#05041A",
  border: "1px solid #2A2560",
  color: "#F5F5FA",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  lineHeight: 1.6,
  outline: "none",
  boxSizing: "border-box",
};

const BTN_PRIMARY: React.CSSProperties = {
  padding: "9px 20px",
  fontFamily: "var(--font-mono)",
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  background: "#0024FF",
  border: "1px solid #0024FF",
  color: "#fff",
  cursor: "pointer",
};

const BTN_GHOST: React.CSSProperties = {
  padding: "9px 16px",
  fontFamily: "var(--font-mono)",
  fontWeight: 600,
  fontSize: 11,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  background: "transparent",
  border: "1px solid #2A2560",
  color: "#7F7BA9",
  cursor: "pointer",
};
