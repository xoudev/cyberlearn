import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry/scrub-event";

Sentry.init({
  ...(process.env.NEXT_PUBLIC_SENTRY_DSN && { dsn: process.env.NEXT_PUBLIC_SENTRY_DSN }),

  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,

  // Replay is browser-only — not configured here

  beforeSend(event) {
    return scrubEvent(event);
  },

  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
});
