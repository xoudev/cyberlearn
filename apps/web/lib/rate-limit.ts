import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { pseudonymize } from "./pseudonymize";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { requestLogger } from "@/lib/request-logger";

// ── Shared client settings ──────────────────────────────────────────────────

// @upstash/redis retries five times by default, sleeping 50, 136, 369, 1004
// and 2730ms between attempts - `Math.exp(retryCount) * 50`. An endpoint that
// is unreachable therefore takes about 4.2 seconds to give up, and every
// limiter in this file sits in front of something a person is waiting for.
//
// One retry covers a dropped packet, which is what a retry is for. It does not
// cover an outage, and pretending otherwise is what turns a broken limiter into
// a slow site.
const REDIS_RETRY = { retries: 1, backoff: () => 100 };

// ── Auth limiters (fail-open, one budget per action) ────────────────────────

function buildAuthRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || !url.startsWith("https://")) return null;
  return new Redis({ url, token, retry: REDIS_RETRY });
}

/** The steps a person goes through before holding a session, each with its own budget. */
export type AuthAction = "sign-in" | "sign-up" | "resend-confirmation" | "password-reset";

/**
 * What each action may do in a quarter of an hour.
 *
 * All of them used to share one budget of five per IP address, and the links
 * of the e-mails (/auth/confirm, /auth/callback) spent from it too. A class
 * signs in from the school's single public address: the sixth pupil of the
 * quarter-hour was told "Trop de tentatives", whatever they were doing and
 * however right their password.
 *
 * So two budgets per action. The one per address typed is the tight one: it
 * is what stands between a script and one account's password, or between one
 * mailbox and a flood of mail. It is keyed on the network as well, so that
 * somebody elsewhere cannot lock a learner out by failing on their address.
 * The one per network only stops a single source from spraying through many
 * accounts, and it is sized for a classroom - thirty-odd people signing up,
 * mistyping, asking for the mail again - with room to spare.
 *
 * A sign-in spends from the address budget before the password is tried,
 * whatever the answer, and in one step: a script that sends twenty attempts
 * at once gets ten through, not twenty. Read first and spent once refused, a
 * burst saw the same untouched budget on every request, and every one of its
 * passwords reached Supabase. Ten leaves room for somebody who signs in again
 * on another device. The network budget, which a whole class shares, still
 * counts only the refused passwords (`recordSignInFailure`).
 */
export const AUTH_BUDGETS: Readonly<
  Record<AuthAction, { readonly perAddress: number; readonly perNetwork: number }>
> = {
  "sign-in": { perAddress: 10, perNetwork: 100 },
  "sign-up": { perAddress: 5, perNetwork: 100 },
  "resend-confirmation": { perAddress: 3, perNetwork: 100 },
  "password-reset": { perAddress: 3, perNetwork: 100 },
};

interface AuthLimiters {
  address: Ratelimit;
  network: Ratelimit;
}

function buildAuthLimiters(redis: Redis): Record<AuthAction, AuthLimiters> {
  const pair = (action: AuthAction): AuthLimiters => ({
    address: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(AUTH_BUDGETS[action].perAddress, "15 m"),
      prefix: `rl:web:auth:${action}:address`,
    }),
    network: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(AUTH_BUDGETS[action].perNetwork, "15 m"),
      prefix: `rl:web:auth:${action}:network`,
    }),
  });
  return {
    "sign-in": pair("sign-in"),
    "sign-up": pair("sign-up"),
    "resend-confirmation": pair("resend-confirmation"),
    "password-reset": pair("password-reset"),
  };
}

const _authRedis = buildAuthRedis();
const authLimiters = _authRedis ? buildAuthLimiters(_authRedis) : null;

// This check runs before the password is verified, so whatever it costs is
// paid by every sign-in attempt - the refused ones as much as the accepted
// ones. A second spent here is a second on the login screen.
const AUTH_LIMIT_TIMEOUT_MS = 1_000;

/**
 * Capped as well as retry-bounded: a request that neither resolves nor rejects
 * would hang the sign-in indefinitely, and the answer we would eventually get
 * is one we are prepared to do without.
 */
async function withAuthTimeout<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`auth rate limit timed out after ${String(AUTH_LIMIT_TIMEOUT_MS)}ms`));
        }, AUTH_LIMIT_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** Both keys pseudonymized: neither the address nor the IP is stored as typed. */
function authKeys(headers: Headers, email: string): { address: string; network: string } {
  const forwarded = headers.get("x-forwarded-for");
  const rawIp = forwarded ? (forwarded.split(",")[0]?.trim() ?? "unknown") : "unknown";
  return {
    address: pseudonymize(`${rawIp}\n${email.trim().toLowerCase()}`),
    network: pseudonymize(rawIp),
  };
}

async function logFailOpen(error: unknown): Promise<void> {
  // Still fail-open - but say so. Swallowing this in silence is how a
  // limiter that answers nobody went unnoticed: it never blocked anyone, it
  // never raised anything, it only made signing in slow.
  const log = await requestLogger();
  log.error({ scope: "rate-limit", err: errorMessage(error) }, "auth check failed open");
}

/**
 * Whether `action` may go ahead for `email` from the network `request` comes
 * from.
 *
 * Spends one unit of both budgets, except for a sign-in, which spends from
 * the address budget and only reads the network's: the refusals are counted
 * against the network afterwards, by `recordSignInFailure`.
 *
 * Authentication must remain available when Redis is missing or temporarily
 * unreachable. The limiter is a defense-in-depth control; Supabase still
 * validates credentials and applies its own abuse protections.
 */
export async function allowAuthAttempt(
  action: AuthAction,
  request: { headers: Headers },
  email: string,
): Promise<boolean> {
  if (!authLimiters) return true;
  const limiters = authLimiters[action];
  try {
    const keys = authKeys(request.headers, email);
    if (action === "sign-in") {
      // `limit` takes its unit atomically, so parallel attempts cannot all
      // see the same remaining budget, as they did through `getRemaining`.
      const [address, network] = await withAuthTimeout(
        Promise.all([
          limiters.address.limit(keys.address),
          limiters.network.getRemaining(keys.network),
        ]),
      );
      return address.success && network.remaining > 0;
    }
    const [address, network] = await withAuthTimeout(
      Promise.all([limiters.address.limit(keys.address), limiters.network.limit(keys.network)]),
    );
    return address.success && network.success;
  } catch (error) {
    await logFailOpen(error);
    return true;
  }
}

/**
 * Counts a refused password against the network it came from. The address
 * budget has already been spent, by `allowAuthAttempt`, before the password
 * was tried.
 */
export async function recordSignInFailure(
  request: { headers: Headers },
  email: string,
): Promise<void> {
  if (!authLimiters) return;
  const limiters = authLimiters["sign-in"];
  try {
    const keys = authKeys(request.headers, email);
    await withAuthTimeout(limiters.network.limit(keys.network));
  } catch (error) {
    await logFailOpen(error);
  }
}

// ── Per-user and per-form limiters (fail-open when Redis unconfigured) ──

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
      // Once per process, and about configuration rather than a request.
      logger.warn(
        { scope: "rate-limit" },
        "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not configured - rate limiting disabled (fail-open).",
      );
      _warnedMissing = true;
    }
    return null;
  }
  _redis = new Redis({ url, token, retry: REDIS_RETRY });
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

/**
 * 30 writes per user per hour that each land in somebody else's notifications:
 * friend requests, note shares, replies on a support ticket. One budget for
 * all of them, like the forum and the lesson Q&A share theirs - somebody
 * flooding other people does not care which button they use.
 */
export async function checkNotifyingWrite(userId: string): Promise<RateLimitResult> {
  if (IS_DEV) return PASS_THROUGH;
  const limiter = getLimiter(
    "notify",
    (r) =>
      new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(30, "1 h"), prefix: "rl:notify" }),
  );
  if (!limiter) return PASS_THROUGH;
  return toResult(await limiter.limit(userId));
}

/**
 * 10 tournament flags per user per minute. A tournament has no cap on
 * attempts, unlike a challenge of the catalogue: this is what stands between a
 * player and a script trying flags, while leaving room for a typo or two.
 */
export async function checkFlagSubmission(userId: string): Promise<RateLimitResult> {
  if (IS_DEV) return PASS_THROUGH;
  const limiter = getLimiter(
    "flag",
    (r) =>
      new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(10, "1 m"), prefix: "rl:flag" }),
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

/** 5 password-change attempts per user per 15 minutes. */
export async function checkPasswordChange(userId: string): Promise<RateLimitResult> {
  if (IS_DEV) return PASS_THROUGH;
  const limiter = getLimiter(
    "password:change",
    (r) =>
      new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(5, "15 m"),
        prefix: "rl:password:change",
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
