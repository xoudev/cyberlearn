"use client";

import React, { useActionState } from "react";
import { AdminConfirmForm } from "../../_components/admin-confirmation";
import { keepFormInput } from "@/lib/form-input";
import {
  disqualifySolveAction,
  requalifySolveAction,
  type SolveActionState,
} from "../_actions/tournament-actions";

/**
 * What can be done to one flag of a tournament, from its row: take it back,
 * with a reason, or put a disqualified one back.
 *
 * A client component for the two forms' pending and refused states, and for
 * the question each asks before it goes: the list is searchable, the row
 * under the pointer is not always the one meant, and both change a team's
 * score on the site and in the app. The reason sits in a fold, so a page of
 * flags stays a page of rows.
 */
export function SolveActionsMenu({
  tournamentId,
  solveId,
  player,
  challenge,
  disqualified,
}: {
  tournamentId: string;
  solveId: string;
  /** How the player is named in the questions. */
  player: string;
  challenge: string;
  disqualified: boolean;
}): React.ReactElement {
  const [state, action, pending] = useActionState<SolveActionState, FormData>(runSolveAction, {});
  const refusal =
    state.error !== undefined ? (
      <p className="a-form-error" role="alert">
        {state.error}
      </p>
    ) : null;

  if (disqualified) {
    return (
      <AdminConfirmForm
        action={action}
        question={`Rétablir le flag de ${player} sur « ${challenge} » ? Il compte de nouveau pour son équipe, à l’heure où il a été trouvé.`}
        style={{ display: "grid", gap: 8, minWidth: 160 }}
      >
        <input type="hidden" name="intent" value="requalify" />
        <input type="hidden" name="tournamentId" value={tournamentId} />
        <input type="hidden" name="solveId" value={solveId} />
        <button
          type="submit"
          disabled={pending}
          className="a-btn a-btn--ghost a-btn--sm"
          style={{ justifySelf: "start" }}
        >
          {pending ? "Rétablissement…" : "Rétablir"}
        </button>
        {refusal}
      </AdminConfirmForm>
    );
  }

  return (
    <div style={{ display: "grid", gap: 8, minWidth: 160, maxWidth: 300 }}>
      <details className="a-disclosure">
        <summary className="a-disclosure-head">
          <span className="a-disclosure-title">Disqualifier…</span>
        </summary>
        <AdminConfirmForm
          action={action}
          onReset={keepFormInput}
          question={`Disqualifier le flag de ${player} sur « ${challenge} » ? Il ne compte plus pour personne, et ne peut pas être soumis de nouveau.`}
          className="a-form a-disclosure-body"
          style={{ paddingTop: 12 }}
        >
          <input type="hidden" name="intent" value="disqualify" />
          <input type="hidden" name="tournamentId" value={tournamentId} />
          <input type="hidden" name="solveId" value={solveId} />
          <label className="a-field">
            <span className="a-label">Motif</span>
            <textarea
              name="reason"
              required
              minLength={5}
              maxLength={300}
              rows={3}
              className="a-textarea"
              placeholder="Flag partagé avec une autre équipe."
            />
            <span className="a-field-hint">
              Obligatoire. Consigné dans l&apos;audit log et repris dans l&apos;export des données
              du joueur.
            </span>
          </label>
          <button type="submit" disabled={pending} className="a-btn a-btn--danger a-btn--sm">
            {pending ? "Disqualification…" : "Disqualifier le flag"}
          </button>
        </AdminConfirmForm>
      </details>
      {refusal}
    </div>
  );
}

/** Sends each form to its own action; both report into the one outcome above. */
function runSolveAction(prev: SolveActionState, formData: FormData): Promise<SolveActionState> {
  return formData.get("intent") === "requalify"
    ? requalifySolveAction(prev, formData)
    : disqualifySolveAction(prev, formData);
}
