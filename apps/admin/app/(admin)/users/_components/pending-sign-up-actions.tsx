"use client";

import React, { useActionState } from "react";
import {
  confirmEmailAction,
  resendConfirmationAction,
  type AccessActionState,
} from "../../_actions/access-actions";
import { AccessOutcome } from "../[id]/_components/sign-in-actions";

/**
 * The two gestures for a sign-up that never confirmed its address: the mail
 * again, or the address confirmed without it.
 *
 * The same actions as on an account's page, called with the Supabase Auth id:
 * there is no profile to open yet. A confirmed row stays on the list, with
 * its notice, until the list is read again; its buttons go, since there is
 * nothing left to confirm.
 */
export function PendingSignUpActions({
  userId,
  email,
}: {
  userId: string;
  email: string;
}): React.ReactElement {
  const [resendState, resendAction, resendPending] = useActionState<AccessActionState, FormData>(
    resendConfirmationAction,
    {},
  );
  const [confirmState, confirmAction, confirmPending] = useActionState<AccessActionState, FormData>(
    confirmEmailAction,
    {},
  );
  const confirmed = confirmState.ok === true;

  return (
    <div style={{ display: "grid", gap: 8, minWidth: 260 }}>
      {!confirmed && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <form action={resendAction}>
            <input type="hidden" name="userId" value={userId} />
            <button
              type="submit"
              disabled={resendPending || confirmPending}
              className="a-btn a-btn--ghost a-btn--sm"
            >
              {resendPending ? "Envoi…" : "Renvoyer l'e-mail de confirmation"}
            </button>
          </form>

          <form
            action={confirmAction}
            onSubmit={(event) => {
              // Cancelling the native submit also cancels the action: React
              // only runs a form's action for a submit nobody prevented.
              if (
                !window.confirm(
                  `Confirmer ${email} sans e-mail ? Personne n'aura prouvé avoir accès à cette boîte : à réserver au cas où le mail n'arrive pas.`,
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="userId" value={userId} />
            <button
              type="submit"
              disabled={resendPending || confirmPending}
              className="a-btn a-btn--ghost a-btn--sm"
            >
              {confirmPending ? "Confirmation…" : "Confirmer l'adresse"}
            </button>
          </form>
        </div>
      )}

      <AccessOutcome state={resendState} />
      <AccessOutcome state={confirmState} />
    </div>
  );
}
