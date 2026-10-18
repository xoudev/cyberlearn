"use client";

import React, { useActionState } from "react";
import { keepFormInput } from "@/lib/form-input";
import { reinstatementQuestion, revocationQuestion } from "@/lib/certificate-notice";
import { notifyResult } from "@/lib/notify";
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
 *
 * Both forms share one outcome. A refusal on a row another administrator just
 * changed comes back with the row redrawn in its real state, so the other
 * form is the one showing: the sentence has to follow it, and the next
 * gesture, from either form, replaces it.
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
  const [state, action, pending] = useActionState<CertificateActionState, FormData>(
    runCertificateAction,
    {},
  );
  const refusal =
    state.error !== undefined ? (
      <p className="a-form-error" role="alert">
        {state.error}
      </p>
    ) : null;

  if (revoked) {
    return (
      <form
        action={action}
        onSubmit={(event) => {
          // Cancelling the native submit also cancels the action: React only
          // runs a form's action for a submit nobody prevented.
          if (!window.confirm(reinstatementQuestion(code, holder, pathTitle))) {
            event.preventDefault();
          }
        }}
        style={{ display: "grid", gap: 8, minWidth: 180 }}
      >
        <input type="hidden" name="intent" value="reinstate" />
        <input type="hidden" name="certificateId" value={certificateId} />
        <button
          type="submit"
          disabled={pending}
          className="a-btn a-btn--ghost a-btn--sm"
          style={{ justifySelf: "start" }}
        >
          {pending ? "Rétablissement…" : "Rétablir"}
        </button>
        {refusal}
      </form>
    );
  }

  return (
    <div style={{ display: "grid", gap: 8, minWidth: 180, maxWidth: 320 }}>
      <details className="a-disclosure">
        <summary className="a-disclosure-head">
          <span className="a-disclosure-title">Révoquer…</span>
        </summary>
        <form
          action={action}
          onReset={keepFormInput}
          onSubmit={(event) => {
            if (!window.confirm(revocationQuestion(code, holder, pathTitle))) {
              event.preventDefault();
            }
          }}
          className="a-form a-disclosure-body"
          style={{ paddingTop: 12 }}
        >
          <input type="hidden" name="intent" value="revoke" />
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
          <button type="submit" disabled={pending} className="a-btn a-btn--danger a-btn--sm">
            {pending ? "Révocation…" : "Révoquer le certificat"}
          </button>
        </form>
      </details>
      {/* Outside the fold: a refused reinstatement redraws the row here, folded. */}
      {refusal}
    </div>
  );
}

/**
 * Sends each form to its own action; both report into the one outcome above.
 * A refusal is said there, on the row. A success used to say nothing: the row
 * simply came back redrawn in its new state, so it is said in a toast.
 */
async function runCertificateAction(
  prev: CertificateActionState,
  formData: FormData,
): Promise<CertificateActionState> {
  const reinstate = formData.get("intent") === "reinstate";
  const result = reinstate
    ? await reinstateCertificateAction(prev, formData)
    : await revokeCertificateAction(prev, formData);
  notifyResult(result, {
    success: reinstate ? "Certificat rétabli." : "Certificat révoqué.",
    error: false,
  });
  return result;
}
