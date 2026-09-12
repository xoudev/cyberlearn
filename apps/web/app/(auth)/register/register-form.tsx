"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { initialAuthActionState } from "../_actions/auth-action-state";
import { signUpWithPassword } from "../_actions/password-auth";
import styles from "../_components/auth-shell.module.css";

export function RegisterForm(): React.JSX.Element {
  const [showPassword, setShowPassword] = useState(false);
  const [state, action, pending] = useActionState(signUpWithPassword, initialAuthActionState);

  if (state.status === "check_email") {
    return (
      <div className={styles.form}>
        <p className={styles.message}>{state.message}</p>
        <Link className={styles.link} href="/login">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form className={styles.form} action={action}>
      <label className={styles.field}>
        <span className={styles.label}>Adresse e-mail</span>
        <input className={styles.input} type="email" name="email" autoComplete="email" required />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Mot de passe</span>
        <span className={styles.inputWrap}>
          <input
            className={[styles.input, styles.passwordInput].join(" ")}
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="new-password"
            minLength={12}
            required
          />
          <button
            className={styles.reveal}
            type="button"
            onClick={() => {
              setShowPassword((value) => !value);
            }}
          >
            {showPassword ? "Masquer" : "Afficher"}
          </button>
        </span>
        <span className={styles.hint}>
          12 caractères minimum, avec au moins une lettre et un chiffre.
        </span>
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Confirmer le mot de passe</span>
        <input
          className={styles.input}
          type={showPassword ? "text" : "password"}
          name="passwordConfirmation"
          autoComplete="new-password"
          minLength={12}
          required
        />
      </label>

      {state.status === "error" ? (
        <p className={[styles.message, styles.error].join(" ")}>{state.message}</p>
      ) : null}

      <button className={styles.submit} type="submit" disabled={pending}>
        {pending ? "Création…" : "Créer mon compte"}
      </button>
      <p className={styles.finePrint}>
        En créant ton compte, tu acceptes les <Link href="/legal/terms">CGU</Link> et la{" "}
        <Link href="/privacy">politique de confidentialité</Link>.
      </p>
      <Link className={styles.link} href="/login">
        J’ai déjà un compte
      </Link>
    </form>
  );
}
