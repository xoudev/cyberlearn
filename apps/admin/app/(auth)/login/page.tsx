"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { initialAdminAuthState, signInAdminWithPassword } from "./actions";
import styles from "../auth.module.css";

export default function AdminLoginPage(): React.JSX.Element {
  const router = useRouter();
  const [state, action, pending] = useActionState(signInAdminWithPassword, initialAdminAuthState);

  useEffect(() => {
    if (state.status === "success" && state.redirectTo) {
      router.replace(state.redirectTo);
      router.refresh();
    }
  }, [router, state]);

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <span className={styles.eyebrow}>{"// admin.cyberlearn"}</span>
        <h1 className={styles.title}>Accès restreint</h1>
        <p className={styles.description}>
          Mot de passe et double authentification obligatoires pour chaque session administrative.
        </p>

        <form className={styles.form} action={action}>
          <label className={styles.field}>
            <span className={styles.label}>Adresse e-mail</span>
            <input
              className={styles.input}
              type="email"
              name="email"
              autoComplete="email"
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Mot de passe</span>
            <input
              className={styles.input}
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>
          {state.status === "error" ? <p className={styles.error}>{state.message}</p> : null}
          <button className={styles.button} type="submit" disabled={pending}>
            {pending ? "Vérification…" : "Continuer"}
          </button>
          <Link className={styles.link} href="https://cyberlearn.fr/forgot-password">
            Définir ou réinitialiser le mot de passe
          </Link>
        </form>
      </section>
    </main>
  );
}
