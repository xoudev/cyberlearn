"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { replyAction } from "../_actions/forum-actions";
import { HELD_FOR_REVIEW } from "@/lib/moderation/held-notice";

/** The box at the bottom of a thread. Absent when the thread is closed. */
export function ReplyBox({ topicId }: { topicId: string }): React.JSX.Element {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [held, setHeld] = useState(false);
  const [pending, start] = useTransition();

  const submit = (e: React.SyntheticEvent): void => {
    e.preventDefault();
    setError(null);
    setHeld(false);
    start(() => {
      void replyAction({ topicId, content }).then((res) => {
        if (res.ok) {
          setContent("");
          setHeld(res.heldForReview === true);
          router.refresh();
          return;
        }
        setError(res.error ?? "Publication impossible.");
      });
    });
  };

  return (
    <form className="fo-form" onSubmit={submit} style={{ marginTop: 24 }}>
      <label>
        <span className="fo-label">Répondre</span>
        <textarea
          className="fo-textarea"
          style={{ minHeight: 140 }}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
          }}
          maxLength={10_000}
          required
          placeholder="Ta réponse…"
        />
        <span className="fo-hint">
          Markdown accepté. Les personnes qui ont écrit dans ce sujet seront prévenues.
        </span>
      </label>

      {error !== null && (
        <p className="fo-error" role="alert">
          {error}
        </p>
      )}

      {held && (
        <p className="fo-held" role="status">
          {HELD_FOR_REVIEW}
        </p>
      )}

      <div>
        <button type="submit" className="fo-btn fo-btn--primary" disabled={pending}>
          {pending ? "Publication…" : "Publier"}
        </button>
      </div>
    </form>
  );
}
