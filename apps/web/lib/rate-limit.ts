import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { pseudonymize } from "./pseudonymize";

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
  const hashedIp = pseudonymize(rawIp);

  const { success } = await authRateLimit.limit(hashedIp);
  return success;
}

// ── New per-action limiters (fail-open when Redis unconfigured) ──

// NODE_ENV=development → bypass (no Redis required locally).
// Other environments: real path runs; if Redis is unconfigured, falls back to fail-open.
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

const PASS_THROUGH: RateLimitResult = {
  success: true,
  limit: Infinity,
  remaining: Infinity,
  reset: 0,
  retryAfterSeconds: 0,
};

let _redis: Redis | null = null;
let _warnedMissing = false;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (!_warnedMissing) {
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not configured — rate limiting disabled (fail-open).",
      );
      _warnedMissing = true;
    }
    return null;
  }
  _redis = new Redis({ url, token });
  return _redis;
}

const _limiters = new Map<string, Ratelimit>();

function getLimiter(key: string, factory: (redis: Redis) => Ratelimit): Ratelimit | null {
  const cached = _limiters.get(key);
  if (cached) return cached;
  const redis = getRedis();
  if (!redis) return null;
  const instance = factory(redis);
  _limiters.set(key, instance);
  return instance;
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
  if (IS_DEV) return PASS_THROUGH;
  const limiter = getLimiter(
    "ml:email",
    (r) =>
      new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(5, "10 m"),
        prefix: "rl:ml:email",
      }),
  );
  if (!limiter) return PASS_THROUGH;
  return toResult(await limiter.limit(pseudonymize(email.trim().toLowerCase())));
}

/** 20 magic link requests per IP per 10 minutes (burst/enumeration protection). */
export async function checkMagicLinkPerIp(rawIp: string): Promise<RateLimitResult> {
  if (IS_DEV) return PASS_THROUGH;
  const limiter = getLimiter(
    "ml:ip",
    (r) =>
      new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(20, "10 m"), prefix: "rl:ml:ip" }),
  );
  if (!limiter) return PASS_THROUGH;
  return toResult(await limiter.limit(pseudonymize(rawIp)));
}

/** 3 contact form submissions per IP per 10 minutes. */
export async function checkContactForm(rawIp: string): Promise<RateLimitResult> {
  if (IS_DEV) return PASS_THROUGH;
  const limiter = getLimiter(
    "contact",
    (r) =>
      new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(3, "10 m"),
        prefix: "rl:contact",
      }),
  );
  if (!limiter) return PASS_THROUGH;
  return toResult(await limiter.limit(pseudonymize(rawIp)));
}

/** 5 Q&A posts (questions or answers) per user per minute. */
export async function checkQaSubmission(userId: string): Promise<RateLimitResult> {
  if (IS_DEV) return PASS_THROUGH;
  const limiter = getLimiter(
    "qa",
    (r) => new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(5, "1 m"), prefix: "rl:qa" }),
  );
  if (!limiter) return PASS_THROUGH;
  return toResult(await limiter.limit(userId));
}

/** 20 hint reveals per user per hour. */
export async function checkHintReveal(userId: string): Promise<RateLimitResult> {
  if (IS_DEV) return PASS_THROUGH;
  const limiter = getLimiter(
    "hint",
    (r) =>
      new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(20, "1 h"), prefix: "rl:hint" }),
  );
  if (!limiter) return PASS_THROUGH;
  return toResult(await limiter.limit(userId));
}

/** 1 data export per user per 24 hours. */
export async function checkDataExport(userId: string): Promise<RateLimitResult> {
  if (IS_DEV) return PASS_THROUGH;
  const limiter = getLimiter(
    "export",
    (r) =>
      new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(1, "24 h"),
        prefix: "rl:export",
      }),
  );
  if (!limiter) return PASS_THROUGH;
  return toResult(await limiter.limit(userId));
}

/** 3 deletion requests per user per 24 hours. */
export async function checkAccountDeletionRequest(userId: string): Promise<RateLimitResult> {
  if (IS_DEV) return PASS_THROUGH;
  const limiter = getLimiter(
    "deletion",
    (r) =>
      new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(3, "24 h"),
        prefix: "rl:deletion",
      }),
  );
  if (!limiter) return PASS_THROUGH;
  return toResult(await limiter.limit(userId));
}

/** 10 quiz starts per user per hour (anti re-roll of the question draw). */
export async function checkQuizStart(userId: string): Promise<RateLimitResult> {
  if (IS_DEV) return PASS_THROUGH;
  const limiter = getLimiter(
    "quiz:start",
    (r) =>
      new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(10, "1 h"),
        prefix: "rl:quiz:start",
      }),
  );
  if (!limiter) return PASS_THROUGH;
  return toResult(await limiter.limit(userId));
}

/** 20 quiz submissions per user per hour (anti submit spam). */
export async function checkQuizSubmit(userId: string): Promise<RateLimitResult> {
  if (IS_DEV) return PASS_THROUGH;
  const limiter = getLimiter(
    "quiz:submit",
    (r) =>
      new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(20, "1 h"),
        prefix: "rl:quiz:submit",
      }),
  );
  if (!limiter) return PASS_THROUGH;
  return toResult(await limiter.limit(userId));
}
