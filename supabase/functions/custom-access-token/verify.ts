// Standard Webhooks signature verification for the custom-access-token hook.
// Extracted into its own module so it can be unit-tested without booting the
// Deno.serve handler (see verify.test.ts).

import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

/** Thrown when the request signature is missing, invalid, or expired. */
export class SignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SignatureError";
  }
}

export interface WebhookHeaders {
  id: string;
  timestamp: string;
  signature: string;
}

/**
 * Verify the Standard Webhooks signature GoTrue attaches to every auth-hook
 * call (login + token refresh). GoTrue signs with the shared secret configured
 * under Auth → Hooks; this rejects any call we can't authenticate.
 *
 * Secret formats (the classic "signature always invalid" footgun):
 *   - Supabase / config.toml store it as  "v1,whsec_<base64>"
 *   - the standardwebhooks library wants   "<base64>"  (bare)
 * so we strip the "v1,whsec_" prefix before constructing the Webhook.
 *
 * @throws SignatureError on missing / invalid / expired signature. Expiry is
 *   enforced by standardwebhooks against `webhook-timestamp` (replay defense).
 */
export function verifyHookSignature(
  secret: string,
  rawBody: string,
  headers: WebhookHeaders,
): void {
  const base64Secret = secret.replace(/^v1,whsec_/, "");
  const wh = new Webhook(base64Secret);
  try {
    wh.verify(rawBody, {
      "webhook-id": headers.id,
      "webhook-timestamp": headers.timestamp,
      "webhook-signature": headers.signature,
    });
  } catch (err) {
    throw new SignatureError(err instanceof Error ? err.message : "invalid signature");
  }
}
