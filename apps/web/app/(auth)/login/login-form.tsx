"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { initialAuthActionState, signInWithPassword } from "../_actions/password-auth";
import styles from "../_components/auth-shell.module.css";

export function LoginForm({
  redirectTo,
  initialError,
}: {
  redirectTo: string;
  initialError: string | null;
}): React.JSX.Element {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [state, action, pending] = useActionState(signInWithPassword, initialAuthActionState);

  useEffect(() => {
    if (state.status === "success" && state.redirectTo) {
      router.replace(state.redirectTo);
      router.refresh();
    }
  }, [router, state]);

  const error = state.status === "error" ? state.message : initialError;

  return (
    <form className={styles.form} action={action}>
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <label className={styles.field}>
        <span className={styles.label}>Adresse e-mail</span>
        <input
          className={styles.input}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="toi@exemple.fr"
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Mot de passe</span>
        <span className={styles.inputWrap}>
          <input
            className={[styles.input, styles.passwordInput].join(" ")}
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
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

      {error ? <p className={[styles.message, styles.error].join(" ")}>{error}</p> : null}

      <button className={styles.submit} type="submit" disabled={pending}>
        {pending ? "Vérification…" : "Se connecter"}
      </button>

      <div className={styles.actions}>
        <Link className={styles.link} href="/forgot-password">
          Mot de passe oublié
        </Link>
        <Link className={styles.link} href="/register">
          Créer un compte
        </Link>
      </div>
    </form>
  );
}
