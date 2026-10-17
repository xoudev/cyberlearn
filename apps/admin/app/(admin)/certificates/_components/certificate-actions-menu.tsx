"use client";

import React, { useActionState } from "react";
import { keepFormInput } from "@/lib/form-input";
import { reinstatementQuestion, revocationQuestion } from "@/lib/certificate-notice";
import {
  reinstateCertificateAction,
  revokeCertificateAction,
  type CertificateActionState,
} from "../_actions/certificate-actions";

/**
 * What can be done to one certificate, from its row: revoke it, with a
 * reason, or put a revoked one back.
 *
 * A client component for the two forms' pending and refused states, and for
 * the question each asks before it goes: the list is sorted and searchable,
 * the row under the pointer is not always the one meant, and both gestures
 * reach the holder. The reason sits in a fold that costs nothing until it is
 * opened, so a page of valid certificates stays a page of rows.
 */
export function CertificateActionsMenu({
  certificateId,
  code,
  holder,
  pathTitle,
  revoked,
}: {
  certificateId: string;
  /** "CL-2026-1A2B3C4D", as the PDF prints it. */
  code: string;
  /** How the holder is named in the questions. */
  holder: string;
  pathTitle: string;
  revoked: boolean;
}): React.ReactElement {
  const [revokeState, revokeAction, revokePending] = useActionState<
    CertificateActionState,
    FormData
  >(revokeCertificateAction, {});
  const [reinstateState, reinstateAction, reinstatePending] = useActionState<
    CertificateActionState,
    FormData
  >(reinstateCertificateAction, {});

  if (revoked) {
    return (
      <form
        action={reinstateAction}
        onSubmit={(event) => {
          // Cancelling the native submit also cancels the action: React only
          // runs a form's action for a submit nobody prevented.
          if (!window.confirm(reinstatementQuestion(code, holder, pathTitle))) {
            event.preventDefault();
          }
        }}
        style={{ display: "grid", gap: 8, minWidth: 180 }}
      >
        <input type="hidden" name="certificateId" value={certificateId} />
        <button
          type="submit"
          disabled={reinstatePending}
          className="a-btn a-btn--ghost a-btn--sm"
          style={{ justifySelf: "start" }}
        >
          {reinstatePending ? "Rétablissement…" : "Rétablir"}
        </button>
        {reinstateState.error !== undefined && (
          <p className="a-form-error" role="alert">
            {reinstateState.error}
          </p>
        )}
      </form>
    );
  }

  return (
    <details className="a-disclosure" style={{ minWidth: 180, maxWidth: 320 }}>
      <summary className="a-disclosure-head">
        <span className="a-disclosure-title">Révoquer…</span>
      </summary>
      <form
        action={revokeAction}
        onReset={keepFormInput}
        onSubmit={(event) => {
          if (!window.confirm(revocationQuestion(code, holder, pathTitle))) {
            event.preventDefault();
          }
        }}
        className="a-form a-disclosure-body"
        style={{ paddingTop: 12 }}
      >
        <input type="hidden" name="certificateId" value={certificateId} />
        <label className="a-field">
          <span className="a-label">Motif</span>
          <textarea
            name="reason"
            required
            minLength={5}
            maxLength={500}
            rows={3}
            className="a-textarea"
            placeholder="Examen final passé par une autre personne."
          />
          <span className="a-field-hint">
            Obligatoire. Repris dans la notification du titulaire et sur la page publique de
            vérification.
          </span>
        </label>
        <button type="submit" disabled={revokePending} className="a-btn a-btn--danger a-btn--sm">
          {revokePending ? "Révocation…" : "Révoquer le certificat"}
        </button>
        {revokeState.error !== undefined && (
          <p className="a-form-error" role="alert">
            {revokeState.error}
          </p>
        )}
      </form>
    </details>
  );
}
