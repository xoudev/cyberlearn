"use client";

import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createSupabaseBrowserClient();

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("redirectTo", redirectTo);

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl.toString(),
        shouldCreateUser: true,
      },
    });

    if (authError) {
      // Do not reveal whether the email exists (prevent user enumeration)
      setError("Une erreur s'est produite. Veuillez réessayer.");
    } else {
      setMagicLinkSent(true);
    }

    setIsLoading(false);
  }

  async function handleGitHubOAuth() {
    setError(null);
    setIsLoading(true);

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("redirectTo", redirectTo);

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: callbackUrl.toString(),
        scopes: "read:user user:email",
      },
    });

    if (authError) {
      setError("Impossible de se connecter avec GitHub. Veuillez réessayer.");
      setIsLoading(false);
    }
    // On success, Supabase redirects the browser — no client-side navigation needed
  }

  if (magicLinkSent) {
    return (
      <main
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: "var(--color-bg-base)" }}
      >
        <div className="w-full max-w-md text-center space-y-4">
          <div className="text-4xl">📬</div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Vérifiez vos emails
          </h1>
          <p style={{ color: "var(--color-text-secondary)" }}>
            Un lien de connexion a été envoyé à{" "}
            <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>
              {email}
            </span>
            . Cliquez sur le lien pour accéder à votre compte.
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Le lien expire dans 60 minutes.
          </p>
          <button
            onClick={() => setMagicLinkSent(false)}
            className="text-sm underline"
            style={{ color: "var(--color-brand-turquoise)" }}
          >
            Utiliser une autre adresse email
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--color-bg-base)" }}
    >
      <div className="w-full max-w-md space-y-8">
        {/* Logo placeholder — will be replaced in Phase 2 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Cyber Learn
          </h1>
          <p className="mt-2" style={{ color: "var(--color-text-secondary)" }}>
            Connectez-vous pour continuer
          </p>
        </div>

        <div
          className="rounded-xl p-8 space-y-6"
          style={{
            backgroundColor: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border-default)",
          }}
        >
          {error && (
            <div
              className="rounded-lg px-4 py-3 text-sm"
              style={{
                backgroundColor: "rgba(255,77,109,0.1)",
                border: "1px solid var(--color-danger)",
                color: "var(--color-danger)",
              }}
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Magic Link form */}
          <form
            onSubmit={(e) => {
              void handleMagicLink(e);
            }}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="vous@exemple.com"
                className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-colors"
                style={{
                  backgroundColor: "var(--color-bg-base)",
                  border: "1px solid var(--color-border-default)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{
                backgroundColor: "var(--color-brand-blue)",
                color: "#ffffff",
              }}
            >
              {isLoading ? "Envoi en cours…" : "Recevoir un lien de connexion"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div
              className="flex-1 h-px"
              style={{ backgroundColor: "var(--color-border-subtle)" }}
            />
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              ou
            </span>
            <div
              className="flex-1 h-px"
              style={{ backgroundColor: "var(--color-border-subtle)" }}
            />
          </div>

          {/* GitHub OAuth */}
          <button
            onClick={() => {
              void handleGitHubOAuth();
            }}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "var(--color-bg-overlay)",
              border: "1px solid var(--color-border-default)",
              color: "var(--color-text-primary)",
            }}
          >
            {/* GitHub icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            Continuer avec GitHub
          </button>
        </div>

        <p className="text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
          En vous connectant, vous acceptez nos{" "}
          <a href="/legal/terms" style={{ color: "var(--color-brand-turquoise)" }}>
            conditions d&apos;utilisation
          </a>{" "}
          et notre{" "}
          <a href="/legal/privacy" style={{ color: "var(--color-brand-turquoise)" }}>
            politique de confidentialité
          </a>
          .
        </p>
      </div>
    </main>
  );
}
