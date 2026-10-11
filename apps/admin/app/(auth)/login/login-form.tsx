"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { signInAdminWithPassword } from "./actions";
import { initialAdminAuthState } from "./auth-state";

export function AdminLoginForm({
  redirectTo,
  initialError,
  forgotPasswordUrl,
}: {
  /** Already checked by the page: a console path, or the dashboard. */
  redirectTo: string;
  initialError: string | null;
  forgotPasswordUrl: string | null;
}): React.JSX.Element {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [state, action, pending] = useActionState(signInAdminWithPassword, initialAdminAuthState);

  useEffect(() => {
    if (state.status === "success" && state.redirectTo) {
      router.replace(state.redirectTo);
      router.refresh();
    }
  }, [router, state]);

  // The reason the middleware gave stays up until a sign-in attempt replaces it.
  const error = state.status === "error" ? state.message : initialError;

  return (
    <form className="a-auth-form" action={action}>
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <label className="a-field">
        <span className="a-label">Adresse e-mail</span>
        <input
          className="a-input"
          type="email"
          name="email"
          autoComplete="email"
          autoFocus
          required
        />
      </label>
      <label className="a-field">
        <span className="a-label">Mot de passe</span>
        <span className="a-input-wrap">
          <input
            className="a-input a-input--reveal"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            required
          />
          <button
            className="a-input-reveal"
            type="button"
            aria-pressed={showPassword}
            onClick={() => {
              setShowPassword((value) => !value);
            }}
          >
            {showPassword ? "Masquer" : "Afficher"}
          </button>
        </span>
      </label>
      {error ? <p className="a-form-error">{error}</p> : null}
      <button className="a-btn a-btn--primary" type="submit" disabled={pending}>
        {pending ? "Vérification…" : "Continuer"}
      </button>
      {forgotPasswordUrl ? (
        <a className="a-card-link" style={{ justifySelf: "start" }} href={forgotPasswordUrl}>
          Définir ou réinitialiser le mot de passe
        </a>
      ) : null}
    </form>
  );
}
