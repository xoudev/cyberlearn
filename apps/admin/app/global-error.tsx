"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background:
            "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(0,36,255,0.14), transparent 60%), #030219",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 460,
            width: "100%",
            background: "#0A0826",
            border: "1px solid #2A2560",
            borderTop: "2px solid #FF4D6D",
            padding: "30px 28px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 18,
              fontFamily: "monospace",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#FF4D6D",
            }}
          >
            <span style={{ width: 22, height: 1, background: "#FF4D6D" }} aria-hidden="true" />
            Erreur d&apos;exécution
          </div>

          <h1
            style={{
              fontWeight: 800,
              fontSize: 24,
              letterSpacing: "-0.03em",
              color: "#F5F5FA",
              margin: "0 0 10px",
            }}
          >
            Une erreur est survenue
          </h1>

          <p style={{ fontSize: 14, color: "#B8B5D1", lineHeight: 1.65, margin: "0 0 18px" }}>
            L&apos;incident a été signalé automatiquement à l&apos;équipe. Tu peux réessayer,
            l&apos;action est sans risque.
          </p>

          {error.digest && (
            <p
              style={{
                fontSize: 11,
                color: "#6B6890",
                fontFamily: "monospace",
                letterSpacing: "0.06em",
                margin: "0 0 22px",
              }}
            >
              Référence : {error.digest}
            </p>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                minHeight: 42,
                padding: "0 20px",
                background: "#0024FF",
                border: "1px solid #0024FF",
                color: "#fff",
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: 10.5,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Réessayer
            </button>
            <a
              href="/dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 42,
                padding: "0 20px",
                border: "1px solid #2A2560",
                color: "#B8B5D1",
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: 10.5,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Retour à l&apos;aperçu
            </a>
            <a
              href={`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://cyberlearn.fr"}/contact${error.digest ? `?ref=${error.digest}` : ""}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 42,
                padding: "0 20px",
                border: "1px solid color-mix(in srgb, #0AFFD4 40%, transparent)",
                color: "#0AFFD4",
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: 10.5,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Signaler le problème
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
