"use client";

// Error boundaries report their exception and receive a client reset callback.
import React, { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { ErrorPanel } from "@/components/error-panel";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return <ErrorPanel scope="site" digest={error.digest} onRetry={reset} />;
}
