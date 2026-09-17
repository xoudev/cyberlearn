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
        style={{
          maxWidth: 480,
          background: "#0A0826",
          border: "1px solid #2A2560",
          padding: "32px 28px",
          fontFamily: "var(--font-mono)",
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: "0.18em", color: "#3F3D5C", marginBottom: 18 }}>
          {"// SECTION · ERREUR"}
        </div>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: "-0.02em",
            color: "#F5F5FA",
            margin: "0 0 12px",
          }}
        >
          Cette section n&apos;a pas pu se charger
        </h1>
        <p style={{ fontSize: 13, color: "#B8B5D1", lineHeight: 1.6, margin: "0 0 24px" }}>
          Une erreur est survenue. L&apos;incident a été signalé ; tu peux réessayer.
        </p>
        {error.digest ? (
          <p
            style={{ fontSize: 11, color: "#3F3D5C", letterSpacing: "0.06em", margin: "0 0 20px" }}
          >
            ID : {error.digest}
          </p>
        ) : null}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "8px 20px",
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              background: "transparent",
              border: "1px solid var(--cosmetic-accent)",
              color: "var(--cosmetic-accent)",
              cursor: "pointer",
            }}
          >
            &#9656; Réessayer
          </button>
          <Link
            href="/dashboard"
            style={{
              padding: "8px 20px",
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              background: "transparent",
              border: "1px solid #2A2560",
              color: "#6B6890",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Dashboard
          </Link>
          <Link
            href={`/contact${error.digest ? `?ref=${error.digest}` : ""}`}
            style={{
              padding: "8px 20px",
              fontFamily: "var(--font-mono)",
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
    </div>
  );
}
