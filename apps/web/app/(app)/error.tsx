"use client";

// The route boundary keeps the app shell and resets only the failed section.
import React, { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { ErrorPanel } from "@/components/error-panel";

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
  return <ErrorPanel scope="app" digest={error.digest} onRetry={reset} />;
}
