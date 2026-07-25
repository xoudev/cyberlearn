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

function buildRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || !url.startsWith("https://")) return null;
  return new Redis({ url, token });
}

const redis = buildRedis();

/** 5 requests per 15 minutes per IP, applied to auth endpoints. */
export const authRateLimit = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "15 m"), prefix: "rl:admin:auth" })
  : null;

/**
 * Checks the auth rate limit for the given request.
 * Returns `true` if the request is allowed, `false` if rate-limited.
 * Always allows when Redis is not configured (graceful degradation).
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

  const { success } = await authRateLimit.limit(hashedIp);
  return success;
}
