"use client";

import React, { useActionState } from "react";
import { signOutMySessionsAction, type AccountActionState } from "../../_actions/account-actions";

const OTHERS_QUESTION =
  "Fermer toutes tes autres sessions ? Le site, l'app et la console te redemanderont de te connecter partout ailleurs. Celle-ci reste ouverte.";
const GLOBAL_QUESTION =
  "Te déconnecter partout, ici compris ? Tu devras te reconnecter à la console, avec ton second facteur.";

/**
 * The two ways out of one's own sessions: every other one, or all of them.
 *
 * A client component for the question each asks before it goes, and for the
 * pending and refused states of the one action they share.
 */
export function OwnSessions(): React.ReactElement {
  const [state, action, pending] = useActionState<AccountActionState, FormData>(
    signOutMySessionsAction,
    {},
  );

  return (
    <div className="a-stack">
      <p className="a-field-hint" style={{ margin: 0 }}>
        Pour un téléphone perdu encore connecté, un mot de passe tapé sur un autre ordinateur. Un
        jeton déjà délivré reste accepté par l&apos;API de données une heure au plus.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <form
          action={action}
          onSubmit={(event) => {
            // Cancelling the native submit also cancels the action.
            if (!window.confirm(OTHERS_QUESTION)) event.preventDefault();
          }}
        >
          <input type="hidden" name="scope" value="others" />
          <button type="submit" disabled={pending} className="a-btn a-btn--ghost a-btn--sm">
            {pending ? "Déconnexion…" : "Fermer mes autres sessions"}
          </button>
        </form>
        <form
          action={action}
          onSubmit={(event) => {
            if (!window.confirm(GLOBAL_QUESTION)) event.preventDefault();
          }}
        >
          <input type="hidden" name="scope" value="global" />
          <button type="submit" disabled={pending} className="a-btn a-btn--danger a-btn--sm">
            Me déconnecter partout
          </button>
        </form>
      </div>
      {state.error !== undefined && (
        <p className="a-form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.notice !== undefined && (
        <p className="a-form-notice" role="status">
          {state.notice}
          {state.auditFailed === true ? " Le geste n'a pas pu être consigné dans l'audit log." : ""}
        </p>
      )}
    </div>
  );
}
