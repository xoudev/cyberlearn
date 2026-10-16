"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { initialAuthActionState } from "../_actions/auth-action-state";
import { updatePassword } from "../_actions/password-auth";
import styles from "../_components/auth-shell.module.css";
import { RestartRecovery } from "./restart-recovery";

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

  // The window closed while the form was open: a new link is the way on.
  if (state.status === "recovery_expired" && state.message) {
    return <RestartRecovery message={state.message} />;
  }

  return (
    <form className={styles.form} action={action}>
      {/* Tells the action this is the recovery form, which has no field for
          the current password, rather than the one in the settings. */}
      <input type="hidden" name="intent" value="recovery" />
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
