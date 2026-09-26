"use client";

import Link from "next/link";
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
          background: "#030219",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            position: "relative",
            maxWidth: 480,
            width: "calc(100vw - 48px)",
            background: "#0A0826",
            border: "1px solid #2A1B1B",
            padding: "32px 28px",
          }}
        >
          {/* Bracket corners */}
          {[
            { top: -1, left: -1, borderTop: "2px solid #FF4757", borderLeft: "2px solid #FF4757" },
            {
              top: -1,
              right: -1,
              borderTop: "2px solid #FF4757",
              borderRight: "2px solid #FF4757",
            },
            {
              bottom: -1,
              left: -1,
              borderBottom: "2px solid #FF4757",
              borderLeft: "2px solid #FF4757",
            },
            {
              bottom: -1,
              right: -1,
              borderBottom: "2px solid #FF4757",
              borderRight: "2px solid #FF4757",
            },
          ].map((style, i) => (
            <span
              key={i}
              aria-hidden="true"
              style={{ position: "absolute", width: 20, height: 20, ...style }}
            />
          ))}

          {/* Eyebrow */}
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.18em",
              color: "#7F7BA9",
              marginBottom: 20,
            }}
          >
            {"// RUNTIME · UNHANDLED ERROR"}
          </div>

          {/* Title */}
          <h1
            style={{
              fontFamily: "system-ui, sans-serif",
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: "-0.02em",
              color: "#F5F5FA",
              margin: "0 0 12px",
            }}
          >
            Erreur inattendue
          </h1>

          <p style={{ fontSize: 14, color: "#B8B5D1", lineHeight: "1.6", margin: "0 0 24px" }}>
            Une erreur critique s&apos;est produite. L&apos;incident a été signalé automatiquement.
          </p>

          {error.digest && (
            <p
              style={{
                fontSize: 11,
                color: "#7F7BA9",
                fontFamily: "monospace",
                letterSpacing: "0.06em",
                margin: "0 0 20px",
              }}
            >
              ID : {error.digest}
            </p>
          )}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "8px 20px",
                fontFamily: "monospace",
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background: "transparent",
                border: "1px solid #0AFFD4",
                color: "#0AFFD4",
                cursor: "pointer",
              }}
            >
              &#9656; Réessayer
            </button>
            <Link
              href="/"
              style={{
                padding: "8px 20px",
                fontFamily: "monospace",
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background: "transparent",
                border: "1px solid #2A2560",
                color: "#7F7BA9",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Accueil
            </Link>
            <Link
              href={`/contact${error.digest ? `?ref=${error.digest}` : ""}`}
              style={{
                padding: "8px 20px",
                fontFamily: "monospace",
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background: "transparent",
                border: "1px solid #2A2560",
                color: "#B8B5D1",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Signaler le problème
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
