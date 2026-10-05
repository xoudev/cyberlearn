"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

// Scoped error boundary for the authenticated app. A render failure in one route
// (e.g. malformed lesson MDX) degrades to this card with a retry, instead of
// blanking the whole route. The incident is still reported to Sentry.
export default function AppError({
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
    <div className="page-container" style={{ paddingTop: 64, paddingBottom: 64 }}>
      <div
        className="card"
        style={{
          maxWidth: 480,
          padding: "32px 28px",
          fontFamily: "var(--font-mono)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.18em",
            color: "var(--color-text-muted)",
            marginBottom: 18,
          }}
        >
          {"// SECTION · ERREUR"}
        </div>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: "-0.02em",
            color: "var(--color-text-primary)",
            margin: "0 0 12px",
          }}
        >
          Cette section n&apos;a pas pu se charger
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--color-text-secondary)",
            lineHeight: 1.6,
            margin: "0 0 24px",
          }}
        >
          Une erreur est survenue. L&apos;incident a été signalé ; tu peux réessayer.
        </p>
        {error.digest ? (
          <p
            style={{
              fontSize: 11,
              color: "var(--color-text-muted)",
              letterSpacing: "0.06em",
              margin: "0 0 20px",
            }}
          >
            ID : {error.digest}
          </p>
        ) : null}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            className="mono-label mono-label--md"
            type="button"
            onClick={reset}
            style={{
              padding: "8px 20px",
              fontWeight: 600,
              background: "transparent",
              border: "1px solid var(--cosmetic-accent)",
              color: "var(--cosmetic-accent)",
              cursor: "pointer",
            }}
          >
            &#9656; Réessayer
          </button>
          <Link
            className="mono-label mono-label--md card card--ghost"
            href="/dashboard"
            style={{
              padding: "8px 20px",
              fontWeight: 600,
              color: "var(--color-text-muted)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Dashboard
          </Link>
          <Link
            className="mono-label mono-label--md card card--ghost"
            href={`/contact${error.digest ? `?ref=${error.digest}` : ""}`}
            style={{
              padding: "8px 20px",
              fontWeight: 600,
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Signaler le problème
          </Link>
        </div>
      </div>
    </div>
  );
}
