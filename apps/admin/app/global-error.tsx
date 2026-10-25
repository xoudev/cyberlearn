"use client";

// A root error replaces the document, so its fallback must work without the app stylesheet.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { brandTypeface } from "@cyberlearn/ui/brand-typeface";

const actionStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  padding: "0 18px",
  font: "inherit",
  fontSize: 13,
  fontWeight: 600,
  textDecoration: "none",
  cursor: "pointer",
  borderRadius: 0,
};

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}): React.JSX.Element {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr" className={`dark ${brandTypeface}`}>
      <head>
        <title>ADMIN · Erreur · CyberLearn</title>
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#0B0C0E",
          color: "#F4F2ED",
          fontFamily: "var(--font-interface), system-ui, sans-serif",
        }}
      >
        <header
          style={{
            boxSizing: "border-box",
            height: 56,
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            borderTop: "2px solid #FF6B2B",
            borderBottom: "1px solid #303137",
            background: "#121418",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          ADMIN · Console d’administration
        </header>
        <main
          style={{
            display: "grid",
            placeItems: "center",
            minHeight: "calc(100vh - 56px)",
            padding: "24px 16px 80px",
            boxSizing: "border-box",
          }}
        >
          <section
            style={{
              maxWidth: 600,
              width: "100%",
              boxSizing: "border-box",
              padding: 24,
              border: "1px solid #303137",
              borderTop: "2px solid #FF929B",
              background: "#121418",
            }}
          >
            <p style={{ margin: "0 0 12px", color: "#FF929B", fontSize: 13 }}>
              Administration · Erreur d’exécution
            </p>
            <h1
              style={{
                fontFamily: "var(--font-display), sans-serif",
                fontSize: 44,
                lineHeight: 1.05,
                margin: "0 0 16px",
              }}
            >
              La console n’a pas pu se charger.
            </h1>
            <p style={{ color: "#C2BFB8", fontSize: 14, lineHeight: 1.65 }}>
              L’incident a été signalé à l’équipe. Réessaie de charger la console.
            </p>
            {error.digest && (
              <p
                style={{
                  color: "#AAA79F",
                  fontSize: 12,
                  fontFamily: "monospace",
                  overflowWrap: "anywhere",
                }}
              >
                Référence : {error.digest}
              </p>
            )}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
              <button
                type="button"
                onClick={retry}
                style={{
                  ...actionStyle,
                  background: "#FF6B2B",
                  color: "#141518",
                  border: "1px solid #FF6B2B",
                }}
              >
                Réessayer
              </button>
              <a
                href="/dashboard"
                style={{ ...actionStyle, color: "#F4F2ED", border: "1px solid #74767D" }}
              >
                Retour à l’aperçu
              </a>
              <a
                href={`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://cyberlearn.fr"}/contact${error.digest ? `?ref=${encodeURIComponent(error.digest)}` : ""}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...actionStyle, color: "#C2BFB8", border: "1px solid #74767D" }}
              >
                Signaler le problème ↗
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
