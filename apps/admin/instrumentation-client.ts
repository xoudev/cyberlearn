import * as Sentry from "@sentry/nextjs";
import { filterBreadcrumb, scrubEvent } from "@/lib/sentry/scrub-event";

Sentry.init({
  // Spread DSN only when defined; exactOptionalPropertyTypes rejects `string | undefined`.
  ...(process.env.NEXT_PUBLIC_SENTRY_DSN && { dsn: process.env.NEXT_PUBLIC_SENTRY_DSN }),

  // Init only when DSN is configured; no-op in local dev without .env.local.
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),

  // 10% of transactions in prod; none in dev (reduces noise and quota).
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,

  // Session replay: disabled by default, 100% on errors.
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllInputs: true,
      maskAllText: true,
      blockAllMedia: false,
      networkDetailAllowUrls: [],
    }),
  ],

  beforeSend(event) {
    return scrubEvent(event);
  },

  beforeBreadcrumb(breadcrumb) {
    return filterBreadcrumb(breadcrumb);
  },

  environment: process.env.NODE_ENV === "production" ? "production-admin" : "development-admin",
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
