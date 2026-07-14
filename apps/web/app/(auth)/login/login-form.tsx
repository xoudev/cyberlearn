"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";
import { initialAuthActionState, signInWithPassword } from "../_actions/password-auth";
import styles from "../_components/auth-shell.module.css";

function GitHubIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export function LoginForm({
  redirectTo,
  initialError,
}: {
  redirectTo: string;
  initialError: string | null;
}): React.JSX.Element {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [oauthPending, setOauthPending] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [state, action, pending] = useActionState(signInWithPassword, initialAuthActionState);

  useEffect(() => {
    if (state.status === "success" && state.redirectTo) {
      router.replace(state.redirectTo);
      router.refresh();
    }
  }, [router, state]);

  const error = oauthError ?? (state.status === "error" ? state.message : initialError);

  async function signInWithGitHub(): Promise<void> {
    setOauthPending(true);
    setOauthError(null);

    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", redirectTo);
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: callbackUrl.toString(),
          scopes: "read:user user:email",
        },
      });
      if (!signInError) return;
      setOauthError("Impossible de se connecter avec GitHub. Réessaie dans un instant.");
    } catch {
      setOauthError("Connexion GitHub interrompue. Vérifie ta connexion puis réessaie.");
    } finally {
      setOauthPending(false);
    }
  }

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

      <button className={styles.submit} type="submit" disabled={pending || oauthPending}>
        {pending ? "Vérification…" : "Se connecter"}
      </button>

      <div className={styles.divider} aria-hidden="true">
        <span />
        <b>ou</b>
        <span />
      </div>

      <button
        className={styles.oauthButton}
        type="button"
        disabled={pending || oauthPending}
        onClick={() => void signInWithGitHub()}
      >
        <GitHubIcon />
        {oauthPending ? "Redirection…" : "Continuer avec GitHub"}
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
