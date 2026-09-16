import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import crypto from "node:crypto";

function getIpSalt(): string {
  const salt = process.env.IP_SALT;
  if (!salt || salt.length < 32) {
    throw new Error(
      "[rate-limit] IP_SALT must be set (>= 32 chars). Generate with: openssl rand -hex 32",
    );
  }
  return salt;
}

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
export const authRateLimit = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "15 m"), prefix: "rl:admin:auth" })
  : null;

const LIMIT_TIMEOUT_MS = 1_000;

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
  // RGPD pseudonymization: never store raw IPs. A hardcoded fallback salt
  // would be public knowledge, so the hash would be trivially reversible for
  // any IPv4 - that is not pseudonymization. Fail closed instead, like the web
  // app does (see apps/web/lib/pseudonymize.ts).
  const hashedIp = crypto.createHmac("sha256", getIpSalt()).update(rawIp).digest("hex");

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // Capped as well as retry-bounded: a request that neither resolves nor
    // rejects would hold the sign-in open indefinitely.
    const { success } = await Promise.race([
      authRateLimit.limit(hashedIp),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`auth rate limit timed out after ${String(LIMIT_TIMEOUT_MS)}ms`));
        }, LIMIT_TIMEOUT_MS);
      }),
    ]);
    return success;
  } catch (error) {
    console.error("[rate-limit] auth check failed open:", error);
    return true;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
