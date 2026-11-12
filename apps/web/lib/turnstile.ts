import { z } from "zod";
import { errorMessage, logger } from "@cyberlearn/lib/logger";

/**
 * Cloudflare Turnstile, in front of the two forms that send a mail to an
 * address an anonymous visitor typed: sign-up and password reset. The contact
 * form sends none, has its own honeypot and time trap, and works without
 * JavaScript, which this check would take away.
 *
 * The rate limits were the only thing between a script and those forms, and
 * they fail open: with Upstash unreachable, or its free quota spent for the
 * day, every one of them lets everything through. A script could then spend
 * the day's hundred mails, and the confirmation of a real sign-up no longer
 * left. This check does not depend on Redis.
 *
 * Off until both keys are set, so a deployment without them behaves as it
 * did. The app signs up through Supabase Auth and never reaches these actions.
 */

/** The field the widget adds to the form it is drawn in. */
export const TURNSTILE_FIELD = "cf-turnstile-response";

export const TURNSTILE_REFUSED =
  "La vérification anti-robot a échoué. Recharge la page et réessaie.";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFY_TIMEOUT_MS = 3_000;
/** Cloudflare's own bound on a token; anything longer is not one. */
const TOKEN_MAX = 2048;

const verdictSchema = z.object({ success: z.boolean() });

/** Whether the check is switched on: both keys, or neither counts. */
export function turnstileEnabled(): boolean {
  return (
    Boolean(process.env.TURNSTILE_SECRET_KEY) && Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
  );
}

/**
 * Whether the form came with a token Cloudflare vouches for.
 *
 * True when the check is off. A missing or refused token is false. Cloudflare
 * not answering is true, and logged: an outage of theirs must not close the
 * sign-up, and the rate limits are still there for that hour.
 */
export async function passesTurnstile(formData: FormData, remoteIp?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!turnstileEnabled() || !secret) return true;

  const token = formData.get(TURNSTILE_FIELD);
  if (typeof token !== "string" || token.length === 0 || token.length > TOKEN_MAX) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    if (!response.ok) {
      logger.warn({ scope: "turnstile", status: response.status }, "turnstile verify unavailable");
      return true;
    }
    const verdict = verdictSchema.safeParse(await response.json());
    if (!verdict.success) {
      logger.warn({ scope: "turnstile" }, "turnstile verify answered an unknown shape");
      return true;
    }
    return verdict.data.success;
  } catch (err) {
    logger.warn({ scope: "turnstile", err: errorMessage(err) }, "turnstile verify unreachable");
    return true;
  }
}

/** The caller's address as the platform reports it, for Cloudflare's own scoring. */
export function clientIp(headers: Headers): string | undefined {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first === undefined || first === "" ? undefined : first;
}
