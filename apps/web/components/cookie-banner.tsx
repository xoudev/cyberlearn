"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const COOKIE_NAME = "cl_consent";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 365 days in seconds

function setConsentCookie(value: "accepted" | "rejected"): void {
  document.cookie = `${COOKIE_NAME}=${value}; max-age=${String(COOKIE_MAX_AGE)}; path=/; SameSite=Lax`;
}

interface CookieBannerProps {
  /** Server-read initial value — avoids flash on revisit */
  initialConsent: string | undefined;
}

export function CookieBanner({ initialConsent }: CookieBannerProps): React.JSX.Element | null {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!initialConsent) {
      setVisible(true);
    }
  }, [initialConsent]);

  if (!visible) return null;

  function handleAccept(): void {
    setConsentCookie("accepted");
    setVisible(false);
  }

  function handleReject(): void {
    setConsentCookie("rejected");
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Gestion des cookies"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#0A0826",
        borderTop: "1px solid #2A2560",
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "12px",
          color: "#B8B5D1",
          fontFamily: "var(--font-mono)",
          maxWidth: "720px",
          lineHeight: "1.5",
        }}
      >
        Ce site utilise des cookies strictement nécessaires à son fonctionnement (authentification,
        préférences). Aucun cookie publicitaire.{" "}
        <Link href="/legal/cgu#cookies" style={{ color: "#4D8BFF", textDecoration: "none" }}>
          En savoir plus
        </Link>
      </p>

      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        <button
          onClick={handleReject}
          style={{
            padding: "6px 16px",
            fontSize: "12px",
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            background: "transparent",
            border: "1px solid #2A2560",
            borderRadius: "0px",
            color: "#6B6890",
            cursor: "pointer",
            transition: "border-color 200ms, color 200ms",
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget;
            btn.style.borderColor = "#4D8BFF";
            btn.style.color = "#B8B5D1";
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget;
            btn.style.borderColor = "#2A2560";
            btn.style.color = "#6B6890";
          }}
        >
          REFUSER
        </button>
        <button
          onClick={handleAccept}
          style={{
            padding: "6px 16px",
            fontSize: "12px",
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            background: "#0024FF",
            border: "1px solid #0024FF",
            borderRadius: "0px",
            color: "#F5F5FA",
            cursor: "pointer",
            transition: "background 200ms",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#1A3AFF";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#0024FF";
          }}
        >
          ACCEPTER
        </button>
      </div>
    </div>
  );
}
