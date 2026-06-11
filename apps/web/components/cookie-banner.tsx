"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const COOKIE_NAME = "cl_consent";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 365 days in seconds

function setConsentCookie(value: "acknowledged"): void {
  document.cookie = `${COOKIE_NAME}=${value}; max-age=${String(COOKIE_MAX_AGE)}; path=/; SameSite=Lax`;
}

interface CookieBannerProps {
  /** Server-read initial value - avoids flash on revisit */
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

  function handleAcknowledge(): void {
    setConsentCookie("acknowledged");
    setVisible(false);
  }

  return (
    <div
      role="region"
      aria-labelledby="cookie-notice-title"
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
      <h2 id="cookie-notice-title" className="sr-only">
        Information cookies
      </h2>
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
        Ce site utilise uniquement des cookies strictement nécessaires à son fonctionnement
        (authentification, préférences de session). Ces cookies sont exemptés de consentement au
        titre de l&apos;article 82 de la loi Informatique et Libertés.{" "}
        <Link href="/privacy#cookies" style={{ color: "#4D8BFF", textDecoration: "none" }}>
          En savoir plus
        </Link>
      </p>

      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        <button
          onClick={handleAcknowledge}
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
          J&apos;AI COMPRIS
        </button>
      </div>
    </div>
  );
}
