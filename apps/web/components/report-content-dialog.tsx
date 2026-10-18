"use client";

import React, { useId, useState } from "react";
import { ModalShell } from "@cyberlearn/ui";
import {
  CONTENT_REPORT_COMMENT_MAX,
  CONTENT_REPORT_PRIVACY,
  CONTENT_REPORT_REASON_KEYS,
  CONTENT_REPORT_REASON_LABELS,
  CONTENT_REPORT_SENT,
  contentReportLabel,
  contentReportQuestion,
  type ContentReportReasonKey,
  type ContentReportSurfaceKey,
} from "@cyberlearn/lib/moderation/report-reasons";
import { reportContentAction } from "@/app/(app)/_actions/report-actions";

/**
 * « Signaler », under what somebody else published: a forum message, a
 * question or an answer under a lesson, a challenge solution, a class
 * resource. A window rather than a form in place: the content stays readable
 * behind it, and a report is a short exchange that asks for an answer.
 *
 * Nothing leaves the page once it is sent: the content is everybody's, and it
 * stays until the team has read it. The button says it was reported, so a
 * second click is not mistaken for a first that failed.
 */
export function ReportContentButton({
  surface,
  contentId,
  className = "btn btn--ghost btn--sm",
}: {
  surface: ContentReportSurfaceKey;
  contentId: string;
  className?: string;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={
          sent ? `${contentReportLabel(surface)} : signalement envoyé` : contentReportLabel(surface)
        }
        aria-haspopup="dialog"
        disabled={sent}
        onClick={() => {
          setOpen(true);
        }}
      >
        {sent ? "Signalé" : "Signaler"}
      </button>
      {open && (
        <ReportContentDialog
          surface={surface}
          contentId={contentId}
          onClose={() => {
            setOpen(false);
          }}
          onSent={() => {
            setSent(true);
          }}
        />
      )}
    </>
  );
}

export function ReportContentDialog({
  surface,
  contentId,
  onClose,
  onSent,
}: {
  surface: ContentReportSurfaceKey;
  contentId: string;
  onClose: () => void;
  onSent: () => void;
}): React.JSX.Element {
  const [reason, setReason] = useState<ContentReportReasonKey | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const commentId = useId();
  const reasonName = useId();

  const send = (): void => {
    if (reason === null) {
      setError("Choisis une raison.");
      return;
    }
    setSending(true);
    setError(null);
    reportContentAction({ surface, contentId, reason, comment })
      .then((result) => {
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setDone(true);
        onSent();
      })
      .catch(() => {
        setError("Le signalement n'a pas pu être envoyé. Réessaie dans un moment.");
      })
      .finally(() => {
        setSending(false);
      });
  };

  const actions = done ? (
    <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
      Fermer
    </button>
  ) : (
    <>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={sending}>
        Annuler
      </button>
      <button
        type="submit"
        form={`${reasonName}-form`}
        className="btn btn--danger btn--sm"
        disabled={sending}
        style={{ opacity: sending ? 0.6 : 1 }}
      >
        {sending ? "Envoi…" : "Envoyer le signalement"}
      </button>
    </>
  );

  return (
    <ModalShell
      open
      onClose={onClose}
      dismissable={!sending}
      eyebrow="Signalement"
      title={done ? "Signalement envoyé" : contentReportQuestion(surface)}
      accent="var(--color-danger)"
      maxWidth={520}
      actions={actions}
    >
      {done ? (
        <p role="status" style={{ margin: 0, padding: "16px 20px", fontSize: 14, lineHeight: 1.6 }}>
          {CONTENT_REPORT_SENT}
        </p>
      ) : (
        <form
          id={`${reasonName}-form`}
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
          style={{ display: "grid", gap: 12, padding: "16px 20px" }}
        >
          <fieldset style={{ border: 0, margin: 0, padding: 0, display: "grid", gap: 8 }}>
            <legend className="sr-only">{contentReportQuestion(surface)}</legend>
            {CONTENT_REPORT_REASON_KEYS.map((key) => (
              <label
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  minHeight: 32,
                  fontSize: 14,
                  color: "var(--color-text-primary)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name={reasonName}
                  value={key}
                  checked={reason === key}
                  onChange={() => {
                    setReason(key);
                    setError(null);
                  }}
                />
                {CONTENT_REPORT_REASON_LABELS[key]}
              </label>
            ))}
          </fieldset>
          <label htmlFor={commentId} style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
            Précisions pour l&apos;équipe (facultatif)
          </label>
          <textarea
            id={commentId}
            value={comment}
            maxLength={CONTENT_REPORT_COMMENT_MAX}
            rows={3}
            onChange={(event) => {
              setComment(event.target.value);
            }}
            style={{
              width: "100%",
              padding: 10,
              background: "var(--color-bg-sunken)",
              border: "1px solid var(--color-border-default)",
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              resize: "vertical",
            }}
          />
          <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-muted)" }}>
            {CONTENT_REPORT_PRIVACY}
          </p>
          {error !== null && (
            <p role="alert" style={{ margin: 0, fontSize: 13, color: "var(--color-danger)" }}>
              {error}
            </p>
          )}
        </form>
      )}
    </ModalShell>
  );
}
