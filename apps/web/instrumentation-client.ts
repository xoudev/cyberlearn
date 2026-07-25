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
    // A replay records the DOM, so anything left unmasked - the account's own
    // email in the navbar, a note, a free-text answer - is personal data sent
    // to a processor outside the EU. Masking everything keeps the replay
    // useful for diagnosing an error (layout, clicks, navigation) without
    // exfiltrating content, which is what makes it defensible under GDPR.
    Sentry.replayIntegration({
      maskAllInputs: true,
      maskAllText: true,
      blockAllMedia: true,
      networkDetailAllowUrls: [],
    }),
  ],

  // Browser-extension noise can mutate the DOM and trigger benign React errors.
  ignoreErrors: [
    "The node to be removed is not a child of this node",
    "The node before which the new node is to be inserted is not a child of this node",
  ],

  beforeSend(event) {
    return scrubEvent(event);
  },

  beforeBreadcrumb(breadcrumb) {
    return filterBreadcrumb(breadcrumb);
  },

  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
