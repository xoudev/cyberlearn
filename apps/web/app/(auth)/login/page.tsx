"use client";

import React, { useState } from "react";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

// ── GitHub SVG ────────────────────────────────────────────────────────────────
function IconGitHub(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

// ── Corner brackets ───────────────────────────────────────────────────────────
function CornerBrackets(): React.ReactElement {
  const s: React.CSSProperties = {
    position: "absolute",
    width: 14,
    height: 14,
    border: "1.5px solid #0AFFD4",
  };
  return (
    <span style={{ position: "absolute", inset: 8, pointerEvents: "none" }} aria-hidden="true">
      <span style={{ ...s, top: 0, left: 0, borderRight: "none", borderBottom: "none" }} />
      <span style={{ ...s, top: 0, right: 0, borderLeft: "none", borderBottom: "none" }} />
      <span style={{ ...s, bottom: 0, left: 0, borderRight: "none", borderTop: "none" }} />
      <span style={{ ...s, bottom: 0, right: 0, borderLeft: "none", borderTop: "none" }} />
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LoginPage(): React.ReactElement {
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
      options: { emailRedirectTo: callbackUrl.toString(), shouldCreateUser: true },
    });

    if (authError) {
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
      options: { redirectTo: callbackUrl.toString(), scopes: "read:user user:email" },
    });

    if (authError) {
      setError("Impossible de se connecter avec GitHub. Veuillez réessayer.");
      setIsLoading(false);
    }
  }

  return (
    <div
      style={{
        background: "#030219",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        color: "#F5F5FA",
      }}
    >
      {/* ── Ambient background glows ─────────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background: [
            "radial-gradient(ellipse 1100px 600px at 20% 30%, rgba(0,36,255,0.22), transparent 60%)",
            "radial-gradient(ellipse 900px 500px at 90% 80%, rgba(10,255,212,0.08), transparent 65%)",
            "radial-gradient(ellipse 700px 500px at 60% 110%, rgba(0,36,255,0.14), transparent 60%)",
          ].join(", "),
        }}
      />
      {/* Grid overlay */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage: [
            "linear-gradient(to right, rgba(42,37,96,0.16) 1px, transparent 1px)",
            "linear-gradient(to bottom, rgba(42,37,96,0.16) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "48px 48px",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 0%, black 40%, transparent 85%)",
          maskImage: "radial-gradient(ellipse at center, black 0%, black 40%, transparent 85%)",
        }}
      />

      {/* ── Top status bar ───────────────────────────────────────────────── */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 44,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "0 32px",
          background: "rgba(3,2,25,0.65)",
          backdropFilter: "blur(20px) saturate(140%)",
          WebkitBackdropFilter: "blur(20px) saturate(140%)",
          borderBottom: "1px solid #2A2560",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#6F6B99",
        }}
      >
        {/* Bottom gradient line */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: -1,
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(10,255,212,0.35) 20%, rgba(0,36,255,0.35) 80%, transparent)",
          }}
        />

        <Image
          src="/icon_app.png"
          alt="CyberLearn"
          width={20}
          height={20}
          priority
          style={{ flexShrink: 0 }}
        />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 14,
            color: "#F5F5FA",
            letterSpacing: "-0.01em",
          }}
        >
          cyber<span style={{ color: "#0AFFD4" }}>learn</span>
        </span>

        <span style={{ color: "#44406B" }}>/</span>
        <span>ACCÈS SÉCURISÉ</span>
        <span style={{ color: "#44406B" }}>/</span>

        <span
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "#0AFFD4",
          }}
        >
          <span
            className="status-live-dot"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#0AFFD4",
              boxShadow: "0 0 6px #0AFFD4",
              display: "inline-block",
              animation: "sidebar-pulse 2s ease-in-out infinite",
            }}
          />
          SYNC EN DIRECT
        </span>
        <span style={{ color: "#44406B" }}>/</span>
        <span>v2.4</span>
      </header>

      {/* ── Main split ───────────────────────────────────────────────────── */}
      <div
        className="login-split-grid"
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          paddingTop: 44,
        }}
      >
        {/* ── Left — editorial ─────────────────────────────────────────── */}
        <div
          className="login-left-panel"
          style={{
            position: "relative",
            padding: "72px 80px 48px",
            flexDirection: "column",
            borderRight: "1px solid #2A2560",
            overflow: "hidden",
          }}
        >
          {/* Scanlines */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "repeating-linear-gradient(to bottom, transparent 0 3px, rgba(10,255,212,0.02) 3px 4px)",
              pointerEvents: "none",
            }}
          />

          {/* Eyebrow */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#6F6B99",
              marginBottom: 36,
            }}
          >
            <span
              style={{
                width: 32,
                height: 1,
                background: "#0AFFD4",
                boxShadow: "0 0 6px #0AFFD4",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            ACCÈS SÉCURISÉ · <b style={{ color: "#0AFFD4", fontWeight: 600 }}>TERMINAL</b>
          </div>

          {/* Hero title */}
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: "clamp(56px, 6.4vw, 96px)",
              lineHeight: 0.92,
              letterSpacing: "-0.045em",
              color: "#F5F5FA",
              margin: 0,
            }}
          >
            Reprends là
            <br />
            où tu t&apos;es{" "}
            <em
              style={{
                fontStyle: "normal",
                background: "linear-gradient(135deg, #0024FF 0%, #0AFFD4 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              arrêté.
            </em>
          </h1>

          <p
            style={{
              margin: "28px 0 0",
              fontFamily: "var(--font-body)",
              fontSize: 18,
              color: "#B8B5D1",
              lineHeight: 1.55,
              maxWidth: 520,
            }}
          >
            Dev, Cybersec, Réseau. Reprends exactement là où tu en es — leçons, quiz et parcours
            t&apos;attendent.
          </p>

          {/* Decorative terminal */}
          <div
            style={{
              marginTop: 56,
              padding: "18px 20px 20px",
              background: "rgba(5,4,26,0.7)",
              border: "1px solid #2A2560",
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              lineHeight: 1.85,
              color: "#B8B5D1",
              maxWidth: 560,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "repeating-linear-gradient(to bottom, transparent 0 3px, rgba(10,255,212,0.035) 3px 4px)",
                pointerEvents: "none",
              }}
            />

            {/* Terminal chrome */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                paddingBottom: 10,
                marginBottom: 12,
                borderBottom: "1px solid #1F1B47",
                fontSize: 10.5,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#6F6B99",
                position: "relative",
                zIndex: 1,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#FF4757",
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#FFB547",
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#0AFFD4",
                  boxShadow: "0 0 6px rgba(10,255,212,0.5)",
                  display: "inline-block",
                }}
              />
              <span style={{ marginLeft: 10 }}>
                ~/cyberlearn/<b style={{ color: "#B8B5D1", fontWeight: 500 }}>auth.session</b>
              </span>
            </div>

            {/* Code lines */}
            <div style={{ position: "relative", zIndex: 1 }}>
              {[
                {
                  n: "01",
                  c: (
                    <span>
                      <span style={{ color: "#6F6B99", fontStyle: "italic" }}>
                        # Initialisation de session sécurisée
                      </span>
                    </span>
                  ),
                },
                {
                  n: "02",
                  c: (
                    <span>
                      <span style={{ color: "#6E8BFF" }}>import</span>{" "}
                      <span style={{ color: "#F5F5FA" }}>cyberlearn</span>{" "}
                      <span style={{ color: "#6E8BFF" }}>as</span>{" "}
                      <span style={{ color: "#F5F5FA" }}>cl</span>
                    </span>
                  ),
                },
                {
                  n: "03",
                  c: (
                    <span>
                      <span style={{ color: "#6E8BFF" }}>session</span>{" "}
                      <span style={{ color: "#6F6B99" }}>=</span> cl
                      <span style={{ color: "#6F6B99" }}>.</span>
                      <span style={{ color: "#F5F5FA" }}>auth</span>
                      <span style={{ color: "#6F6B99" }}>.</span>
                      <span style={{ color: "#0AFFD4" }}>connect</span>
                      <span style={{ color: "#6F6B99" }}>()</span>
                    </span>
                  ),
                },
                {
                  n: "04",
                  c: (
                    <span style={{ color: "#6F6B99", fontStyle: "italic" }}>
                      # 3 modules · Dev · Cybersec · Réseau
                    </span>
                  ),
                },
                {
                  n: "05",
                  c: (
                    <span>
                      <span style={{ color: "#0AFFD4" }}>{">"}</span> Session ouverte —{" "}
                      <span style={{ color: "#0AFFD4" }}>accès autorisé</span>
                    </span>
                  ),
                },
                {
                  n: "06",
                  c: (
                    <span>
                      <span style={{ color: "#0AFFD4" }}>{">"}</span>{" "}
                      <span
                        style={{
                          display: "inline-block",
                          width: 7,
                          height: 13,
                          background: "#0AFFD4",
                          boxShadow: "0 0 8px #0AFFD4",
                          verticalAlign: "-2px",
                          animation: "blink 1s step-end infinite",
                        }}
                      />
                    </span>
                  ),
                },
              ].map(({ n, c }) => (
                <div key={n} style={{ display: "flex", gap: 14 }}>
                  <span
                    style={{
                      color: "#44406B",
                      userSelect: "none",
                      width: 18,
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {n}
                  </span>
                  <span style={{ flex: 1 }}>{c}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom logo */}
          <div
            style={{
              marginTop: "auto",
              display: "flex",
              alignItems: "center",
              gap: 12,
              paddingTop: 40,
            }}
          >
            <Image
              src="/icon_app.png"
              alt="CyberLearn"
              width={32}
              height={32}
              style={{ flexShrink: 0 }}
            />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                fontSize: 17,
                letterSpacing: "-0.01em",
                color: "#F5F5FA",
              }}
            >
              cyber<span style={{ color: "#0AFFD4" }}>learn</span>
            </span>
            <span
              style={{
                marginLeft: 14,
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                color: "#6F6B99",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "3px 9px",
                border: "1px solid #2A2560",
              }}
            >
              BETA · FR
            </span>
          </div>
        </div>

        {/* ── Right — auth panel ───────────────────────────────────────── */}
        <div
          className="login-right-panel"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 16px 48px",
          }}
        >
          {magicLinkSent ? (
            <SuccessState email={email} onReset={() => setMagicLinkSent(false)} />
          ) : (
            <AuthPanel
              email={email}
              onEmailChange={setEmail}
              onMagicLink={(e) => {
                void handleMagicLink(e);
              }}
              onGitHub={() => {
                void handleGitHubOAuth();
              }}
              error={error}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Auth panel ────────────────────────────────────────────────────────────────

function AuthPanel({
  email,
  onEmailChange,
  onMagicLink,
  onGitHub,
  error,
  isLoading,
}: {
  email: string;
  onEmailChange: (v: string) => void;
  onMagicLink: (e: React.FormEvent<HTMLFormElement>) => void;
  onGitHub: () => void;
  error: string | null;
  isLoading: boolean;
}): React.ReactElement {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 460,
        padding: "36px 36px 28px",
        background: "rgba(10,8,38,0.85)",
        border: "1px solid #2A2560",
      }}
    >
      {/* Edge glow */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: -1,
          zIndex: -1,
          background:
            "linear-gradient(135deg, rgba(10,255,212,0.35), rgba(0,36,255,0.25) 50%, transparent 100%)",
          filter: "blur(16px)",
          opacity: 0.55,
        }}
      />

      <CornerBrackets />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 18,
          marginBottom: 26,
          borderBottom: "1px solid #1F1B47",
          position: "relative",
          zIndex: 1,
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            fontSize: 12.5,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#F5F5FA",
            margin: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "#0AFFD4", fontWeight: 700 }}>›</span>
          AUTHENTIFICATION
        </h2>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#6F6B99",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#0AFFD4",
              boxShadow: "0 0 6px #0AFFD4",
              display: "inline-block",
              animation: "sidebar-pulse 2s ease-in-out infinite",
            }}
          />
          SESSION LIVE
        </span>
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {error && (
          <div
            role="alert"
            style={{
              marginBottom: 18,
              padding: "10px 14px",
              background: "rgba(255,71,87,0.08)",
              border: "1px solid rgba(255,71,87,0.4)",
              color: "#FF4757",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.04em",
            }}
          >
            {error}
          </div>
        )}

        {/* Email field */}
        <form onSubmit={onMagicLink} style={{ marginBottom: 0 }}>
          <label
            htmlFor="email"
            style={{
              display: "block",
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#0AFFD4",
              marginBottom: 10,
            }}
          >
            <span style={{ marginRight: 4 }}>›</span> Adresse email
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            required
            autoComplete="email"
            placeholder="vous@exemple.com"
            style={{
              display: "block",
              width: "100%",
              height: 48,
              padding: "0 16px",
              background: "#05041A",
              border: "1px solid #2A2560",
              color: "#F5F5FA",
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              letterSpacing: "0.01em",
              outline: "none",
              marginBottom: 16,
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#0AFFD4";
              e.currentTarget.style.boxShadow =
                "0 0 0 1px rgba(10,255,212,0.3), 0 0 14px rgba(10,255,212,0.12)";
              e.currentTarget.style.background = "#06052A";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#2A2560";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.background = "#05041A";
            }}
          />

          <PrimaryButton type="submit" disabled={isLoading || !email}>
            {isLoading ? (
              "Envoi en cours…"
            ) : (
              <>
                Connexion via lien{" "}
                <span
                  style={{
                    fontSize: 16,
                    marginLeft: 4,
                    display: "inline-block",
                    transition: "transform 180ms ease",
                  }}
                >
                  →
                </span>
              </>
            )}
          </PrimaryButton>
        </form>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "22px 0 18px",
            gap: 10,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#6F6B99",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: "#44406B" }}>──</span>
          ou
          <span style={{ color: "#44406B" }}>──</span>
        </div>

        {/* GitHub */}
        <GhostButton onClick={onGitHub} disabled={isLoading}>
          <IconGitHub />
          Continuer avec GitHub
        </GhostButton>

        {/* Footer legal */}
        <div
          style={{
            marginTop: 22,
            paddingTop: 18,
            borderTop: "1px solid #1F1B47",
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "#6F6B99",
            letterSpacing: "0.06em",
            lineHeight: 1.6,
            textAlign: "center",
          }}
        >
          En continuant, vous acceptez nos{" "}
          <a
            href="/legal/terms"
            className="link-underline"
            style={{
              color: "#B8B5D1",
              textDecoration: "none",
              borderBottom: "1px solid #2A2560",
              paddingBottom: 1,
            }}
          >
            conditions
          </a>{" "}
          et notre{" "}
          <a
            href="/legal/privacy"
            className="link-underline"
            style={{
              color: "#B8B5D1",
              textDecoration: "none",
              borderBottom: "1px solid #2A2560",
              paddingBottom: 1,
            }}
          >
            politique de confidentialité
          </a>
          .
        </div>
      </div>
    </div>
  );
}

// ── Success state ─────────────────────────────────────────────────────────────

function SuccessState({
  email,
  onReset,
}: { email: string; onReset: () => void }): React.ReactElement {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 460,
        padding: "36px 36px 28px",
        background: "rgba(10,8,38,0.85)",
        border: "1px solid #2A2560",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: -1,
          zIndex: -1,
          background:
            "linear-gradient(135deg, rgba(10,255,212,0.35), rgba(0,36,255,0.25) 50%, transparent 100%)",
          filter: "blur(16px)",
          opacity: 0.55,
        }}
      />
      <CornerBrackets />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "18px 4px 8px",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Hexagonal check */}
        <div
          style={{
            width: 72,
            height: 72,
            display: "grid",
            placeItems: "center",
            border: "1.5px solid #0AFFD4",
            background: "rgba(10,255,212,0.08)",
            marginBottom: 28,
            boxShadow: "0 0 32px rgba(10,255,212,0.25), inset 0 0 20px rgba(10,255,212,0.08)",
            clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
          }}
          aria-hidden="true"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            style={{ color: "#0AFFD4", filter: "drop-shadow(0 0 8px #0AFFD4)" }}
          >
            <path
              d="M6 14 L11 20 L22 9"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 800,
            fontSize: 40,
            lineHeight: 1,
            letterSpacing: "-0.03em",
            color: "#F5F5FA",
            margin: "0 0 18px",
          }}
        >
          Vérifiez vos emails
        </h2>

        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            lineHeight: 1.65,
            color: "#B8B5D1",
            margin: "0 0 10px",
            maxWidth: 340,
          }}
        >
          Un lien sécurisé a été envoyé à{" "}
          <b style={{ color: "#0AFFD4", fontWeight: 600 }}>{email}</b>. Cliquez dessus pour accéder
          à votre compte.
        </p>

        <div
          style={{
            margin: "10px 0 26px",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "#F5F5FA",
            padding: "8px 14px",
            border: "1px solid #2A2560",
            background: "#05041A",
            letterSpacing: "0.02em",
          }}
        >
          {email}
        </div>

        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#6F6B99",
            margin: "0 0 20px",
          }}
        >
          Le lien expire dans <b style={{ color: "#B8B5D1" }}>60 minutes</b>.
        </p>

        <button
          onClick={onReset}
          className="link-underline"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#B8B5D1",
            background: "none",
            border: "none",
            borderBottom: "1px solid #2A2560",
            padding: "0 0 3px",
            cursor: "pointer",
          }}
        >
          Utiliser une autre adresse
        </button>
      </div>
    </div>
  );
}

// ── Shared button primitives ──────────────────────────────────────────────────

function PrimaryButton({
  children,
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
}): React.ReactElement {
  return (
    <button
      type={type}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        width: "100%",
        height: 52,
        padding: "0 20px",
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        border: "1px solid #0024FF",
        background: "#0024FF",
        color: "#FFFFFF",
        opacity: disabled ? 0.5 : 1,
        boxShadow: "0 0 24px rgba(0,36,255,0.35), inset 0 0 0 1px rgba(255,255,255,0.1)",
        transition: "background 180ms ease, box-shadow 180ms ease",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = "#1F3BFF";
        e.currentTarget.style.boxShadow =
          "0 0 32px rgba(0,36,255,0.55), inset 0 0 0 1px rgba(255,255,255,0.18)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#0024FF";
        e.currentTarget.style.boxShadow =
          "0 0 24px rgba(0,36,255,0.35), inset 0 0 0 1px rgba(255,255,255,0.1)";
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        width: "100%",
        height: 52,
        padding: "0 20px",
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        background: "#05041A",
        border: "1px solid #2A2560",
        color: "#F5F5FA",
        opacity: disabled ? 0.5 : 1,
        transition: "background 180ms ease, border-color 180ms ease",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.borderColor = "#6F6B99";
        e.currentTarget.style.background = "#0A0826";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#2A2560";
        e.currentTarget.style.background = "#05041A";
      }}
    >
      {children}
    </button>
  );
}
