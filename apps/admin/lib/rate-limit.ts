import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { pseudonymize } from "@cyberlearn/lib/pseudonymize";
import { logger, errorMessage } from "@cyberlearn/lib/logger";

// @upstash/redis retries five times by default, sleeping `Math.exp(n) * 50`
// between attempts - 50, 136, 369, 1004, 2730ms, about 4.2s before it gives
// up. One retry covers a dropped packet, which is what a retry is for; it does
// not cover an outage, and here the wait lands on an admin at a login form.
const REDIS_RETRY = { retries: 1, backoff: () => 100 };

function buildRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || !url.startsWith("https://")) return null;
  return new Redis({ url, token, retry: REDIS_RETRY });
}

const redis = buildRedis();

/** 5 requests per 15 minutes per IP, applied to auth endpoints. */
const authRateLimit = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "15 m"), prefix: "rl:admin:auth" })
  : null;

/**
 * 5 announcements per hour per administrator. One goes to every account at
 * once: a second click, a script left running or a session that is not its
 * owner's should stop at a handful, not at the whole user base a few times.
 */
const announcementRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 h"),
      prefix: "rl:admin:announce",
    })
  : null;

const LIMIT_TIMEOUT_MS = 1_000;

/**
 * Asks a limiter about a key, allowing when it does not answer: an error and a
 * timeout are logged and let through, like an unconfigured Redis.
 */
async function allowedBy(limiter: Ratelimit, key: string, name: string): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // Capped as well as retry-bounded: a request that neither resolves nor
    // rejects would hold the form open indefinitely.
    const { success } = await Promise.race([
      limiter.limit(key),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${name} rate limit timed out after ${String(LIMIT_TIMEOUT_MS)}ms`));
        }, LIMIT_TIMEOUT_MS);
      }),
    ]);
    return success;
  } catch (error) {
    logger.error({ scope: "rate-limit", err: errorMessage(error) }, `${name} check failed open`);
    return true;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * Checks the auth rate limit for the given request.
 * Returns `true` if the request is allowed, `false` if rate-limited.
 *
 * Allows when Redis is not configured, and equally when it is configured and
 * unreachable - the caller cannot tell those apart and should not have to. A
 * throw here was caught by the sign-in action and turned into "Le service
 * d'authentification est indisponible", so a dead rate limiter locked every
 * admin out of the console while password and TOTP were both working. The
 * action already carries that lesson in its own comment; this is the same one,
 * one layer down.
 */
export async function checkAuthRateLimit(request: { headers: Headers }): Promise<boolean> {
  if (!authRateLimit) return true;

  const forwarded = request.headers.get("x-forwarded-for");
  const rawIp = forwarded ? (forwarded.split(",")[0]?.trim() ?? "unknown") : "unknown";
  // RGPD pseudonymization: never store raw IPs. This used to be the same HMAC
  // written out here, under a salt read by a second getter - one primitive, two
  // implementations, and nothing to stop them drifting apart.
  return allowedBy(authRateLimit, pseudonymize(rawIp), "auth");
}

/**
 * Whether this administrator may send another announcement now. Keyed on the
 * account rather than the address: the session is what sends it. Fails open
 * for the reason the sign-in limit does - the gate in front of it is the
 * ADMIN role and a TOTP challenge, not Redis.
 */
export async function checkAnnouncementRateLimit(adminId: string): Promise<boolean> {
  if (!announcementRateLimit) return true;
  return allowedBy(announcementRateLimit, adminId, "announcement");
}
