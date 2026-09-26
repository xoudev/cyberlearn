"use client";

import React, { useId, useState } from "react";
import {
  NOTE_REPORT_COMMENT_MAX,
  NOTE_REPORT_REASON_KEYS,
  NOTE_REPORT_REASON_LABELS,
  type NoteReportReasonKey,
} from "@cyberlearn/lib/notes/report-reasons";

/**
 * Reporting a received note to the team, inside the reader: a reason, an
 * optional comment, and the note leaves the reader's list once it is sent.
 * The author is not told who reported it, and nothing counts against them
 * until the team has read it.
 */
export function ReportNoteForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: {
    reason: NoteReportReasonKey;
    comment: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  onCancel: () => void;
}): React.JSX.Element {
  const [reason, setReason] = useState<NoteReportReasonKey | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const commentId = useId();

  const send = (): void => {
    if (reason === null) {
      setError("Choisis une raison.");
      return;
    }
    setSending(true);
    setError(null);
    void onSubmit({ reason, comment }).then((result) => {
      setSending(false);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
      style={{
        display: "grid",
        gap: 12,
        padding: "14px 22px",
        borderBottom: "1px solid #1F1B47",
        background: "rgba(255,71,87,0.04)",
      }}
    >
      <fieldset style={{ border: 0, margin: 0, padding: 0, display: "grid", gap: 8 }}>
        <legend
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#B8B5D1",
            marginBottom: 8,
          }}
        >
          Pourquoi signaler cette note ?
        </legend>
        {NOTE_REPORT_REASON_KEYS.map((key) => (
          <label
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 14,
              color: "#F5F5FA",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="note-report-reason"
              value={key}
              checked={reason === key}
              onChange={() => {
                setReason(key);
              }}
            />
            {NOTE_REPORT_REASON_LABELS[key]}
          </label>
        ))}
      </fieldset>
      <label htmlFor={commentId} style={{ fontSize: 13, color: "#B8B5D1" }}>
        Précisions pour l&apos;équipe (facultatif)
      </label>
      <textarea
        id={commentId}
        value={comment}
        maxLength={NOTE_REPORT_COMMENT_MAX}
        rows={3}
        onChange={(event) => {
          setComment(event.target.value);
        }}
        style={{
          width: "100%",
          padding: 10,
          background: "#05041A",
          border: "1px solid #2A2560",
          color: "#F5F5FA",
          fontFamily: "var(--font-body)",
          fontSize: 14,
          resize: "vertical",
        }}
      />
      <p style={{ margin: 0, fontSize: 12, color: "#7F7BA9" }}>
        L&apos;auteur ne saura pas qui a signalé sa note. Elle sera retirée de tes notes reçues.
      </p>
      {error !== null ? (
        <p role="alert" style={{ margin: 0, fontSize: 13, color: "#FF4757" }}>
          {error}
        </p>
      ) : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="submit"
          disabled={sending}
          style={{
            padding: "8px 14px",
            background: "#FF4757",
            border: "1px solid #FF4757",
            color: "#030219",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: sending ? "wait" : "pointer",
            opacity: sending ? 0.6 : 1,
          }}
        >
          {sending ? "Envoi…" : "Envoyer le signalement"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={sending}
          style={{
            padding: "8px 14px",
            background: "transparent",
            border: "1px solid #2A2560",
            color: "#B8B5D1",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
