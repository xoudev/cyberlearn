import * as Sentry from "@sentry/nextjs";
import { SENTRY_DATA_COLLECTION } from "@/lib/sentry/data-collection";
import { scrubEvent } from "@/lib/sentry/scrub-event";

// Minimal config for the Edge runtime (middleware).
// Edge has limited Node.js API access, so keep integrations minimal.
Sentry.init({
  ...(process.env.NEXT_PUBLIC_SENTRY_DSN && { dsn: process.env.NEXT_PUBLIC_SENTRY_DSN }),

  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),

  // Sentry 11 collects bodies, cookies and IPs unless told not to: see data-collection.ts.
  dataCollection: SENTRY_DATA_COLLECTION,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,

  beforeSend(event) {
    return scrubEvent(event);
  },

  environment: process.env.NODE_ENV === "production" ? "production-admin" : "development-admin",
});
