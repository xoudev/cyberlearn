"use client";

import Link from "next/link";
import { useActionState } from "react";
import { initialAuthActionState } from "../_actions/auth-action-state";
import { requestPasswordReset } from "../_actions/password-auth";
import styles from "../_components/auth-shell.module.css";

export function ForgotPasswordForm(): React.JSX.Element {
  const [state, action, pending] = useActionState(requestPasswordReset, initialAuthActionState);

  return (
    <form className={styles.form} action={action}>
      <label className={styles.field}>
        <span className={styles.label}>Adresse e-mail</span>
        <input className={styles.input} type="email" name="email" autoComplete="email" required />
      </label>

      {state.message ? (
        <p
          className={[styles.message, state.status === "error" ? styles.error : undefined]
            .filter(Boolean)
            .join(" ")}
        >
          {state.message}
        </p>
      ) : null}

      <button
        className={styles.submit}
        type="submit"
        disabled={pending || state.status === "check_email"}
      >
        {pending ? "Envoi…" : "Envoyer le lien"}
      </button>
      <Link className={styles.link} href="/login">
        Retour à la connexion
      </Link>
    </form>
  );
}
