// Next.js instrumentation file: Sentry SDK init for server + edge runtimes,
// and Zod's French messages for the server actions (@cyberlearn/types/zod-locale).
// See: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

import * as Sentry from "@sentry/nextjs";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    // For what the actions return; instrumentation-client.ts sets it for the
    // lesson editors, which run the components' parsers in the browser.
    const { configureZodLocale } = await import("@cyberlearn/types/zod-locale");
    configureZodLocale();
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Routes server-component and server-action errors to Sentry automatically.
export const onRequestError = Sentry.captureRequestError;
