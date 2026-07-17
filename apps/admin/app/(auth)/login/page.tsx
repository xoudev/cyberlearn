"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { AdminAuthShell } from "../auth-shell";
import { initialAdminAuthState, signInAdminWithPassword } from "./actions";

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
    <AdminAuthShell
      eyebrow="Console d'administration"
      title="Accès restreint"
      description="Mot de passe et double authentification obligatoires pour chaque session administrative."
    >
      <form className="a-auth-form" action={action}>
        <label className="a-field">
          <span className="a-label">Adresse e-mail</span>
          <input className="a-input" type="email" name="email" autoComplete="email" required />
        </label>
        <label className="a-field">
          <span className="a-label">Mot de passe</span>
          <input
            className="a-input"
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </label>
        {state.status === "error" ? <p className="a-form-error">{state.message}</p> : null}
        <button className="a-btn a-btn--primary" type="submit" disabled={pending}>
          {pending ? "Vérification…" : "Continuer"}
        </button>
        <Link
          className="a-card-link"
          style={{ justifySelf: "start" }}
          href="https://cyberlearn.fr/forgot-password"
        >
          Définir ou réinitialiser le mot de passe
        </Link>
      </form>
    </AdminAuthShell>
  );
}
