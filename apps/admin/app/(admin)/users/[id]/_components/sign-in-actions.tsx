"use client";

import React, { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  confirmEmailAction,
  resendConfirmationAction,
  sendPasswordResetAction,
  type AccessActionState,
} from "../../../_actions/access-actions";

/**
 * The mails that get somebody back to the door: a new password, and the
 * confirmation of an address that never got it.
 *
 * Each sends what the learner would get from the site on their own, to the
 * account's mailbox, so the console never holds a link that opens the account.
 * Confirming without the mail is the exception, and asks first: it vouches for
 * an address nobody proved they read.
 *
 * The labels are short on purpose. A console button does not wrap, and these
 * sit in a card that has to fit a phone.
 */
export function SignInActions({
  userId,
  email,
  confirmed,
}: {
  userId: string;
  email: string;
  confirmed: boolean;
}): React.ReactElement {
  const [resetState, resetAction, resetPending] = useActionState<AccessActionState, FormData>(
    sendPasswordResetAction,
    {},
  );
  const [resendState, resendAction, resendPending] = useActionState<AccessActionState, FormData>(
    resendConfirmationAction,
    {},
  );
  const [confirmState, confirmAction, confirmPending] = useActionState<AccessActionState, FormData>(
    confirmEmailAction,
    {},
  );
  const router = useRouter();
  // The action revalidates nothing, so that the list of pending sign-ups keeps
  // the row it was confirmed from. Here the page is read again once it worked:
  // the address shows as confirmed and these buttons go, and this component,
  // which stays mounted, keeps the notice.
  useEffect(() => {
    if (confirmState.ok === true) router.refresh();
  }, [confirmState, router]);

  return (
    <div className="a-form" style={{ marginTop: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <form action={resetAction}>
          <input type="hidden" name="userId" value={userId} />
          <button type="submit" disabled={resetPending} className="a-btn a-btn--ghost a-btn--sm">
            {resetPending ? "Envoi…" : "Envoyer un lien de réinitialisation"}
          </button>
        </form>

        {!confirmed && (
          <>
            <form action={resendAction}>
              <input type="hidden" name="userId" value={userId} />
              <button
                type="submit"
                disabled={resendPending}
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
                disabled={confirmPending}
                className="a-btn a-btn--ghost a-btn--sm"
              >
                {confirmPending ? "Confirmation…" : "Confirmer l'adresse"}
              </button>
            </form>
          </>
        )}
      </div>

      <AccessOutcome state={resetState} />
      <AccessOutcome state={resendState} />
      <AccessOutcome state={confirmState} />
    </div>
  );
}

/**
 * Shown when a gesture went through but its audit row did not: the gesture is
 * not undone and must not be repeated, but the log is missing a line someone
 * will look for.
 */
export const AUDIT_FAILED =
  "Ce geste n'a pas pu être inscrit au journal d'audit. Il n'est pas annulé pour autant : ne le refais pas, et garde-en une trace ailleurs.";

/** What a gesture came to: its error, or its notice and a missing audit row. */
export function AccessOutcome({ state }: { state: AccessActionState }): React.ReactElement | null {
  if (state.error !== undefined) return <p className="a-form-error">{state.error}</p>;
  if (state.notice === undefined) return null;
  return (
    <>
      <p className="a-form-notice">{state.notice}</p>
      {state.auditFailed === true && <p className="a-form-error">{AUDIT_FAILED}</p>}
    </>
  );
}
