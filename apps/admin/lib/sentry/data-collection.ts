import type { init } from "@sentry/nextjs";

// The type lives in @sentry/core, which @sentry/nextjs does not re-export.
type DataCollection = NonNullable<NonNullable<Parameters<typeof init>[0]>["dataCollection"]>;

// Deny-terms for headers and query parameters: Sentry's own list of the ones
// that carry a client address or an identity.
const IDENTIFYING = ["forwarded", "-ip", "remote-", "via", "-user"];

/**
 * What the SDK may attach to an event, set down to the v10 baseline.
 *
 * Sentry 11 turned collection on by default: cookies, request and response
 * bodies, the user's IP, database query data. Bodies alone would carry a
 * password, a note or a free-text answer to a processor outside the EU.
 * Leaving this unset is therefore not "the old default" any more - it is the
 * permissive one - so every init passes this object.
 */
export const SENTRY_DATA_COLLECTION: DataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: { request: { deny: IDENTIFYING }, response: { deny: IDENTIFYING } },
  httpBodies: [],
  urlQueryParams: { deny: IDENTIFYING },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  graphQL: { document: false, variables: false },
  frameContextLines: 7,
};
