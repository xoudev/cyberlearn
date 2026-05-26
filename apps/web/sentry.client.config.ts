import * as Sentry from "@sentry/nextjs";
import { filterBreadcrumb, scrubEvent } from "@/lib/sentry/scrub-event";

Sentry.init({
  // Spread DSN only when defined — exactOptionalPropertyTypes rejects `string | undefined`
  ...(process.env.NEXT_PUBLIC_SENTRY_DSN && { dsn: process.env.NEXT_PUBLIC_SENTRY_DSN }),

  // Init only when DSN is configured — no-op in local dev without .env.local
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),

  // 10% of transactions in prod; none in dev (reduces noise and quota)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,

  // Session replay: disabled by default, 100% on errors
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllInputs: true, // RGPD: mask form fields (passwords, emails, etc.)
      maskAllText: false, // UI labels are fine
      blockAllMedia: false,
      networkDetailAllowUrls: [], // Never capture request/response bodies
    }),
  ],

  // Strip PII before every event leaves the browser
  beforeSend(event) {
    return scrubEvent(event);
  },

  beforeBreadcrumb(breadcrumb) {
    return filterBreadcrumb(breadcrumb);
  },

  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
});
