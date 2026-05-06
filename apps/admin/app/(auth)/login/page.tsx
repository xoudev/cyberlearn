"use client";

import React, { useState } from "react";
import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";
import { sendAdminMagicLink } from "./actions";

function IconGitHub(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export default function AdminLoginPage(): React.ReactElement {
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleMagicLink(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const fd = new FormData();
      fd.set("email", email);
      const result = await sendAdminMagicLink({ error: null }, fd);
      if (result.error) {
        setError(result.error);
      } else {
        setMagicLinkSent(true);
      }
    } catch {
      setError("Une erreur inattendue s'est produite. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGitHubOAuth() {
    setError(null);
    setIsLoading(true);

    const supabase = createSupabaseBrowserClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: callbackUrl.toString(), scopes: "read:user user:email" },
    });

    if (authError) {
      setError("Impossible de se connecter avec GitHub.");
      setIsLoading(false);
    }
  }

  const DANGER = "#FF4D6D";
  const TURQUOISE = "#0AFFD4";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#030219",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glows */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background: [
            "radial-gradient(ellipse 800px 400px at 20% 30%, rgba(0,36,255,0.18), transparent 60%)",
            "radial-gradient(ellipse 600px 400px at 80% 70%, rgba(10,255,212,0.07), transparent 65%)",
          ].join(", "),
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 400,
          background: "#0A0826",
          border: "1px solid #2A2560",
          padding: "40px 36px",
        }}
      >
        {/* Corner brackets */}
        {(
          [
            { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2 },
            { top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2 },
            { bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2 },
            { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2 },
          ] as React.CSSProperties[]
        ).map((s, i) => (
          <span
            key={i}
            aria-hidden="true"
            style={{
              position: "absolute",
              width: 14,
              height: 14,
              borderStyle: "solid",
              borderWidth: 0,
              borderColor: TURQUOISE,
              ...s,
            }}
          />
        ))}

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: DANGER,
              marginBottom: 10,
            }}
          >
            {"// admin.cyberlearn"}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: 28,
              letterSpacing: "-0.03em",
              color: "#F5F5FA",
              margin: "0 0 8px",
            }}
          >
            Accès restreint
          </h1>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "#6B6890",
              margin: 0,
            }}
          >
            Réservé aux comptes avec le rôle <b style={{ color: DANGER }}>ADMIN</b>.
          </p>
        </div>

        {magicLinkSent ? (
          <div
            style={{
              padding: "20px 18px",
              background: "rgba(10,255,212,0.05)",
              border: "1px solid rgba(10,255,212,0.2)",
              borderLeft: `3px solid ${TURQUOISE}`,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: TURQUOISE,
                marginBottom: 8,
              }}
            >
              Lien envoyé
            </div>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "#B8B5D1",
                margin: 0,
                lineHeight: 1.55,
              }}
            >
              Vérifie ta boîte mail pour le lien de connexion.
            </p>
          </div>
        ) : (
          <>
            {/* Magic link form */}
            <form
              onSubmit={(e) => {
                void handleMagicLink(e);
              }}
              style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                placeholder="adresse@exemple.com"
                required
                autoComplete="email"
                style={{
                  background: "rgba(5,4,26,0.8)",
                  border: "1px solid #2A2560",
                  color: "#F5F5FA",
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  padding: "12px 14px",
                  outline: "none",
                  width: "100%",
                }}
              />

              {error && (
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: DANGER,
                    margin: 0,
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  padding: "13px 20px",
                  background: "#0024FF",
                  border: "1px solid #0024FF",
                  color: "#fff",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.6 : 1,
                  boxShadow: "0 0 20px rgba(0,36,255,0.4)",
                }}
              >
                {isLoading ? "Envoi…" : "Envoyer le lien magique"}
              </button>
            </form>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <span style={{ flex: 1, height: 1, background: "#1F1B47" }} />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "#44406B",
                  letterSpacing: "0.1em",
                }}
              >
                OU
              </span>
              <span style={{ flex: 1, height: 1, background: "#1F1B47" }} />
            </div>

            <button
              type="button"
              onClick={() => void handleGitHubOAuth()}
              disabled={isLoading}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "13px 20px",
                background: "transparent",
                border: "1px solid #2A2560",
                color: "#B8B5D1",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              <IconGitHub />
              Continuer avec GitHub
            </button>
          </>
        )}
      </div>
    </div>
  );
}
