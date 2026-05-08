import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import crypto from "node:crypto";

// ── Legacy auth limiter (fail-open, keeps auth/confirm + auth/callback working) ──

function buildRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || !url.startsWith("https://")) return null;
  return new Redis({ url, token });
}

const _legacyRedis = buildRedis();

export const authRateLimit = _legacyRedis
  ? new Ratelimit({
      redis: _legacyRedis,
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      prefix: "rl:web:auth",
    })
  : null;

export async function checkAuthRateLimit(request: { headers: Headers }): Promise<boolean> {
  // Fail-open: if Redis is unconfigured, allow the request rather than blocking all auth.
  // The magic-link *generation* endpoint is fail-closed; the callback is not, because
  // a Redis outage must not prevent legitimate users from completing their login.
  if (!authRateLimit) return true;

  const forwarded = request.headers.get("x-forwarded-for");
  const rawIp = forwarded ? (forwarded.split(",")[0]?.trim() ?? "unknown") : "unknown";
  const hashedIp = crypto.createHmac("sha256", getSalt()).update(rawIp).digest("hex");

  const { success } = await authRateLimit.limit(hashedIp);
  return success;
}

// ── New per-action limiters (fail-closed in prod, bypass in development only) ──

// NODE_ENV=test → real path runs so unit tests can exercise limiter logic.
// NODE_ENV=development → bypass (no Redis required locally).
// NODE_ENV=production without Upstash vars → throws at first call (impossible to miss).
const IS_DEV = process.env.NODE_ENV === "development";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Unix timestamp (ms) when the window resets. */
  reset: number;
  /** Seconds until the client may retry. 0 when success. */
  retryAfterSeconds: number;
}

const DEV_PASS: RateLimitResult = {
  success: true,
  limit: Infinity,
  remaining: Infinity,
  reset: 0,
  retryAfterSeconds: 0,
};

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "[rate-limit] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in production.",
    );
  }
  _redis = new Redis({ url, token });
  return _redis;
}

const _limiters = new Map<string, Ratelimit>();

function getLimiter(key: string, factory: (redis: Redis) => Ratelimit): Ratelimit {
  const cached = _limiters.get(key);
  if (cached) return cached;
  const instance = factory(getRedis());
  _limiters.set(key, instance);
  return instance;
}

function getSalt(): string {
  const salt = process.env.IP_SALT;
  if (!salt || salt.length < 32) {
    throw new Error(
      "[rate-limit] IP_SALT must be set (>= 32 chars). Generate with: openssl rand -hex 32",
    );
  }
  return salt;
}

function pseudonymize(value: string): string {
  return crypto.createHmac("sha256", getSalt()).update(value).digest("hex");
}

function toResult(r: {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}): RateLimitResult {
  return {
    ...r,
    retryAfterSeconds: r.success ? 0 : Math.max(0, Math.ceil((r.reset - Date.now()) / 1000)),
  };
}

/** 5 magic link requests per email per 10 minutes. */
export async function checkMagicLinkPerEmail(email: string): Promise<RateLimitResult> {
  if (IS_DEV) return DEV_PASS;
  const result = await getLimiter(
    "ml:email",
    (r) =>
      new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(5, "10 m"),
        prefix: "rl:ml:email",
      }),
  ).limit(pseudonymize(email.trim().toLowerCase()));
  return toResult(result);
}

/** 20 magic link requests per IP per 10 minutes (burst/enumeration protection). */
export async function checkMagicLinkPerIp(rawIp: string): Promise<RateLimitResult> {
  if (IS_DEV) return DEV_PASS;
  const result = await getLimiter(
    "ml:ip",
    (r) =>
      new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(20, "10 m"), prefix: "rl:ml:ip" }),
  ).limit(pseudonymize(rawIp));
  return toResult(result);
}

/** 3 contact form submissions per IP per 10 minutes. */
export async function checkContactForm(rawIp: string): Promise<RateLimitResult> {
  if (IS_DEV) return DEV_PASS;
  const result = await getLimiter(
    "contact",
    (r) =>
      new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(3, "10 m"),
        prefix: "rl:contact",
      }),
  ).limit(pseudonymize(rawIp));
  return toResult(result);
}

/** 5 Q&A posts (questions or answers) per user per minute. */
export async function checkQaSubmission(userId: string): Promise<RateLimitResult> {
  if (IS_DEV) return DEV_PASS;
  const result = await getLimiter(
    "qa",
    (r) => new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(5, "1 m"), prefix: "rl:qa" }),
  ).limit(userId);
  return toResult(result);
}

/** 20 hint reveals per user per hour. */
export async function checkHintReveal(userId: string): Promise<RateLimitResult> {
  if (IS_DEV) return DEV_PASS;
  const result = await getLimiter(
    "hint",
    (r) =>
      new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(20, "1 h"), prefix: "rl:hint" }),
  ).limit(userId);
  return toResult(result);
}
