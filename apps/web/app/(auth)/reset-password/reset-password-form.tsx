"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { initialAuthActionState } from "../_actions/auth-action-state";
import { updatePassword } from "../_actions/password-auth";
import styles from "../_components/auth-shell.module.css";

export function ResetPasswordForm(): React.JSX.Element {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [state, action, pending] = useActionState(updatePassword, initialAuthActionState);

  useEffect(() => {
    if (state.status === "success" && state.redirectTo) {
      router.replace(state.redirectTo);
      router.refresh();
    }
  }, [router, state]);

  return (
    <form className={styles.form} action={action}>
      <label className={styles.field}>
        <span className={styles.label}>Nouveau mot de passe</span>
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
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Confirmer</span>
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
        {pending ? "Mise à jour…" : "Enregistrer le mot de passe"}
      </button>
    </form>
  );
}
