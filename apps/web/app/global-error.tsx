"use client";

// This boundary replaces the root document, so it brings its own styles, fonts and colours.
import React, { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { ErrorPanel } from "@/components/error-panel";
import { brandTypeface } from "@/components/brand-typeface";

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
    <html lang="fr" className={brandTypeface}>
      <head>
        <title>Erreur inattendue · CyberLearn</title>
      </head>
      <body style={{ margin: 0, background: "#0b0c0e", color: "#f4f2ed" }}>
        <ErrorPanel scope="global" digest={error.digest} onRetry={reset} />
      </body>
    </html>
  );
}
