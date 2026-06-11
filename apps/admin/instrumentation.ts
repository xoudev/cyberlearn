// Next.js instrumentation file: Sentry SDK init for server + edge runtimes.
// See: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

import * as Sentry from "@sentry/nextjs";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Routes server-component and server-action errors to Sentry automatically.
export const onRequestError = Sentry.captureRequestError;
