"use client";

import { useActionState } from "react";
import { RESEND_CONFIRMATION_LABEL } from "@cyberlearn/lib/auth/email-confirmation";
import { initialAuthActionState } from "../_actions/auth-action-state";
import { resendConfirmationEmail } from "../_actions/password-auth";
import styles from "./auth-shell.module.css";

/**
 * "Renvoyer l'e-mail de confirmation", for an address that has not been
 * confirmed yet. A form of its own, next to the sign-in or sign-up form rather
 * than inside it: forms do not nest.
 */
export function ResendConfirmation({ email }: { email: string }): React.JSX.Element {
  const [state, action, pending] = useActionState(resendConfirmationEmail, initialAuthActionState);

  return (
    <form className={styles.form} action={action}>
      <input type="hidden" name="email" value={email} />
      {state.message ? (
        <p
          className={[styles.message, state.status === "error" ? styles.error : undefined]
            .filter(Boolean)
            .join(" ")}
          role="status"
        >
          {state.message}
        </p>
      ) : null}
      <button className={styles.link} type="submit" disabled={pending}>
        {pending ? "Envoi…" : RESEND_CONFIRMATION_LABEL}
      </button>
    </form>
  );
}
