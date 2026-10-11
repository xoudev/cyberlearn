"use client";

import React, { useActionState, useState } from "react";
import { resetMfaAction, type AccessActionState } from "../../../_actions/access-actions";
import { Card } from "../../../_components/admin-ui";
import { AUDIT_FAILED } from "./sign-in-actions";

/**
 * Removing the second factor of somebody who lost the phone it lived on.
 *
 * Supabase keeps no backup codes, so without this the console's only answer to
 * a lost phone was deleting the account. It asks for the account's address,
 * typed, as the deletion form does: a confirmation that the administrator is
 * on the account they meant, not a check of who asked. The address is on the
 * page for anybody to copy; making sure the request came from the account's
 * holder is the administrator's work before the click, which the card says.
 * The server checks the address again, and refuses the reset on oneself, on
 * any administrator, and on an account that was one recently.
 *
 * When the console must not do it, the card says why instead of showing a form
 * the server would refuse.
 */
export function MfaResetForm({
  userId,
  email,
  displayName,
  factorCount,
  refusal,
}: {
  userId: string;
  email: string;
  displayName: string;
  /** TOTP factors on the account, finished or not. */
  factorCount: number;
  /** Why the console will not do it here, already in French, or null. */
  refusal: string | null;
}): React.ReactElement | null {
  const [state, formAction, pending] = useActionState<AccessActionState, FormData>(
    resetMfaAction,
    {},
  );
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  if (state.ok === true) {
    return (
      <Card title="Double authentification réinitialisée" pad>
        <p className="a-form-notice">
          {state.notice}
          {state.emailFailed === true
            ? " L'e-mail d'information n'a pas pu être envoyé : préviens la personne autrement, pour qu'elle réactive sa double authentification."
            : ` Un e-mail a prévenu ${displayName} et lui demande de la réactiver.`}
        </p>
        {state.auditFailed === true && <p className="a-form-error">{AUDIT_FAILED}</p>}
      </Card>
    );
  }

  // Nothing to remove, and nothing to report yet.
  if (factorCount === 0) return null;

  if (refusal !== null) {
    return (
      <Card title="Double authentification" pad>
        <p className="a-form-notice">{refusal}</p>
      </Card>
    );
  }

  return (
    <Card title="Réinitialiser la double authentification" pad>
      <p className="a-form-notice">
        Retire {factorCount > 1 ? `les ${String(factorCount)} facteurs` : "le facteur"} TOTP de ce
        compte, pour une personne qui a perdu le téléphone qui générait ses codes. Elle se connecte
        ensuite comme d&apos;habitude, sans code, ses sessions ouvertes sont fermées, et un e-mail
        lui demande de réactiver la double authentification. À faire seulement après avoir vérifié
        que la demande vient bien d&apos;elle.
      </p>

      <form action={formAction} className="a-form" style={{ marginTop: 16 }}>
        <input type="hidden" name="userId" value={userId} />

        <label className="a-field">
          <span className="a-label">Confirme en saisissant l&apos;adresse du compte</span>
          <input
            name="confirmEmail"
            required
            autoComplete="off"
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
            }}
            className="a-input"
            placeholder={email}
          />
          <span className="a-field-hint mono">{email}</span>
        </label>

        <button
          type="submit"
          disabled={pending || !matches}
          className="a-btn a-btn--danger"
          style={{ whiteSpace: "normal" }}
          title={matches ? undefined : "Saisis l'adresse du compte pour activer ce bouton"}
        >
          {pending ? "Réinitialisation…" : "Réinitialiser la double authentification"}
        </button>

        {state.error !== undefined && <p className="a-form-error">{state.error}</p>}
        {state.auditFailed === true && <p className="a-form-error">{AUDIT_FAILED}</p>}
      </form>
    </Card>
  );
}
