/**
 * Rate limit unit tests - mocks Upstash so no real Redis is needed in CI.
 *
 * Each check function is exercised to its N-th call (success) and N+1th (blocked).
 * Uses unique identifiers per test so in-memory counters never collide.
 */

import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "@cyberlearn/lib/logger";

// ── Env stubs - must be set before the module is imported ────────────────────
// getRedis() reads process.env directly (not the t3-oss typed env)
vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://mock.upstash.io");
vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "mock-token");
vi.stubEnv("IP_SALT", "a-test-salt-that-is-at-least-32-characters-long");

// ── Mocks ────────────────────────────────────────────────────────────────────

// Simulate an in-memory sliding window counter per (prefix, identifier) key.
// The limit is encoded in the Ratelimit constructor options.
const counters = new Map<string, number>();
let rejectNextLimit = false;
let hangNextLimit = false;

vi.mock("@upstash/redis", () => ({
  // A function, not an arrow: the module calls `new Redis(...)`, and since
  // Vitest 4 a mock keeps its implementation's semantics - arrows cannot be
  // constructed.
  Redis: vi.fn(function () {
    return {};
  }),
}));

vi.mock("@upstash/ratelimit", () => {
  const Ratelimit = vi.fn(function (
    this: { limit_: number; prefix_: string },
    { limiter, prefix }: { limiter: { limit: number }; prefix?: string },
  ) {
    this.limit_ = limiter.limit;
    this.prefix_ = prefix ?? "rl";
  });

  // Instance method
  (Ratelimit.prototype as { limit: (id: string) => Promise<unknown> }).limit = function (
    this: { limit_: number; prefix_: string },
    identifier: string,
  ): Promise<unknown> {
    if (rejectNextLimit) {
      rejectNextLimit = false;
      return Promise.reject(new Error("Redis unavailable"));
    }
    // An endpoint that accepts the connection and then answers nothing - the
    // shape a rejection never takes and a timeout is the only cure for.
    if (hangNextLimit) {
      hangNextLimit = false;
      return new Promise(() => undefined);
    }
    const key = `${this.prefix_}:${identifier}`;
    const count = (counters.get(key) ?? 0) + 1;
    counters.set(key, count);
    const success = count <= this.limit_;
    return Promise.resolve({
      success,
      limit: this.limit_,
      remaining: Math.max(0, this.limit_ - count),
      reset: Date.now() + 600_000,
    });
  };

  // Reads the window without spending from it, like Ratelimit#getRemaining.
  (Ratelimit.prototype as { getRemaining: (id: string) => Promise<unknown> }).getRemaining =
    function (this: { limit_: number; prefix_: string }, identifier: string): Promise<unknown> {
      if (rejectNextLimit) {
        rejectNextLimit = false;
        return Promise.reject(new Error("Redis unavailable"));
      }
      if (hangNextLimit) {
        hangNextLimit = false;
        return new Promise(() => undefined);
      }
      const count = counters.get(`${this.prefix_}:${identifier}`) ?? 0;
      return Promise.resolve({
        remaining: Math.max(0, this.limit_ - count),
        limit: this.limit_,
        reset: Date.now() + 600_000,
      });
    };

  // Static factory - encodes limit into an object the constructor reads
  (
    Ratelimit as unknown as { slidingWindow: (limit: number, window: string) => { limit: number } }
  ).slidingWindow = vi.fn((limit: number) => ({ limit }));

  return { Ratelimit };
});

// ── Ensure rate-limit runs in test (not dev) mode ───────────────────────────
// The module reads process.env.NODE_ENV at load time to set IS_DEV.
// vitest sets NODE_ENV="test" by default - IS_DEV stays false, good.

// ── Import after mocks ───────────────────────────────────────────────────────
// Dynamic import ensures the mock is registered before the module initialises.
const {
  checkContactForm,
  checkQaSubmission,
  checkHintReveal,
  checkDataExport,
  allowAuthAttempt,
  recordSignInFailure,
  AUTH_BUDGETS,
} = await import("@/lib/rate-limit");

// ── Helpers ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  counters.clear();
  rejectNextLimit = false;
  hangNextLimit = false;
});

function uid(): string {
  return randomUUID();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("checkContactForm - 3 / 10 min", () => {
  it("allows first 3 requests", async () => {
    const ip = uid();
    for (let i = 0; i < 3; i++) {
      const r = await checkContactForm(ip);
      expect(r.success).toBe(true);
    }
  });

  it("blocks the 4th request", async () => {
    const ip = uid();
    for (let i = 0; i < 3; i++) await checkContactForm(ip);
    const r = await checkContactForm(ip);
    expect(r.success).toBe(false);
    expect(r.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("checkQaSubmission - 5 / min", () => {
  it("allows first 5 requests", async () => {
    const userId = uid();
    for (let i = 0; i < 5; i++) {
      const r = await checkQaSubmission(userId);
      expect(r.success).toBe(true);
    }
  });

  it("blocks the 6th request", async () => {
    const userId = uid();
    for (let i = 0; i < 5; i++) await checkQaSubmission(userId);
    const r = await checkQaSubmission(userId);
    expect(r.success).toBe(false);
    expect(r.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("checkHintReveal - 20 / hour", () => {
  it("allows first 20 requests", async () => {
    const userId = uid();
    for (let i = 0; i < 20; i++) {
      const r = await checkHintReveal(userId);
      expect(r.success).toBe(true);
    }
  });

  it("blocks the 21st request", async () => {
    const userId = uid();
    for (let i = 0; i < 20; i++) await checkHintReveal(userId);
    const r = await checkHintReveal(userId);
    expect(r.success).toBe(false);
    expect(r.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("checkDataExport - 1 / 24h", () => {
  it("allows the first request", async () => {
    const userId = uid();
    const r = await checkDataExport(userId);
    expect(r.success).toBe(true);
    expect(r.retryAfterSeconds).toBe(0);
  });

  it("blocks the second request and returns retryAfterSeconds > 0", async () => {
    const userId = uid();
    await checkDataExport(userId);
    const r = await checkDataExport(userId);
    expect(r.success).toBe(false);
    expect(r.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("isolation - different identifiers don't share counters", () => {
  it("two addresses have independent counters", async () => {
    const ipA = uid();
    const ipB = uid();
    for (let i = 0; i < 3; i++) await checkContactForm(ipA);
    // ipA is now blocked
    const blockedA = await checkContactForm(ipA);
    expect(blockedA.success).toBe(false);
    // ipB is untouched
    const passB = await checkContactForm(ipB);
    expect(passB.success).toBe(true);
  });
});

describe("getSalt() - missing or invalid IP_SALT throws", () => {
  // Temporarily override IP_SALT per test; restore afterward so other suites are unaffected
  it("throws when IP_SALT is not set", async () => {
    vi.stubEnv("IP_SALT", "");
    await expect(checkContactForm("203.0.113.9")).rejects.toThrow("IP_SALT must be set");
  });

  it("throws when IP_SALT is shorter than 32 chars", async () => {
    vi.stubEnv("IP_SALT", "tooshort");
    await expect(checkContactForm("203.0.113.9")).rejects.toThrow("IP_SALT must be set");
  });

  afterEach(() => {
    // Restore the salt for subsequent test suites
    vi.stubEnv("IP_SALT", "a-test-salt-that-is-at-least-32-characters-long");
    counters.clear();
  });
});

describe("fail-open - Upstash not configured", () => {
  // Uses a fresh module instance (vi.resetModules) so the singleton state
  // (_redis, _warnedMissing) starts clean and the env change takes effect.
  afterEach(() => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://mock.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "mock-token");
  });

  it("returns PASS_THROUGH and warns exactly once; second call skips warn", async () => {
    vi.resetModules();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    // After resetModules: the rate limiter will import a fresh logger, and the
    // spy has to sit on that instance, not on the one this file started with.
    const { logger: freshLogger } = await import("@cyberlearn/lib/logger");
    const warnSpy = vi.spyOn(freshLogger, "warn").mockImplementation((): void => undefined);

    const { checkDataExport: checkDataExportFresh } = await import("@/lib/rate-limit");

    const r1 = await checkDataExportFresh(uid());
    expect(r1.success).toBe(true);
    expect(r1.limit).toBe(Infinity);
    expect(r1.remaining).toBe(Infinity);
    expect(r1.retryAfterSeconds).toBe(0);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      { scope: "rate-limit" },
      expect.stringContaining("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not configured"),
    );

    // Second call - _warnedMissing flag must suppress duplicate warn
    await checkDataExportFresh(uid());
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });
});

/** A request from one network, as the auth actions receive it. */
function from(ip: string): { headers: Headers } {
  return { headers: new Headers({ "x-forwarded-for": `${ip}, 10.0.0.1` }) };
}

function address(): string {
  return `${uid()}@example.fr`;
}

describe("auth budgets - a class behind one public address", () => {
  it("lets a whole class sign up, each with an address of their own", async () => {
    const school = from(uid());
    for (let pupil = 0; pupil < 35; pupil++) {
      expect(await allowAuthAttempt("sign-up", school, address())).toBe(true);
    }
  });

  it("does not spend the sign-in budget on passwords that were right", async () => {
    const school = from(uid());
    const email = address();
    for (let i = 0; i < AUTH_BUDGETS["sign-in"].perAddress * 3; i++) {
      expect(await allowAuthAttempt("sign-in", school, email)).toBe(true);
    }
  });

  it("refuses an address after five refused passwords, and only that address", async () => {
    const school = from(uid());
    const email = address();
    for (let i = 0; i < AUTH_BUDGETS["sign-in"].perAddress; i++) {
      expect(await allowAuthAttempt("sign-in", school, email)).toBe(true);
      await recordSignInFailure(school, email);
    }
    expect(await allowAuthAttempt("sign-in", school, email)).toBe(false);
    // The pupil at the next desk is not locked out by somebody else's typos.
    expect(await allowAuthAttempt("sign-in", school, address())).toBe(true);
  });

  it("does not let failures elsewhere lock somebody's address", async () => {
    const email = address();
    const elsewhere = from(uid());
    for (let i = 0; i < AUTH_BUDGETS["sign-in"].perAddress; i++) {
      await recordSignInFailure(elsewhere, email);
    }
    expect(await allowAuthAttempt("sign-in", elsewhere, email)).toBe(false);
    expect(await allowAuthAttempt("sign-in", from(uid()), email)).toBe(true);
  });

  it("keeps one budget per action", async () => {
    const school = from(uid());
    const email = address();
    for (let i = 0; i < AUTH_BUDGETS["sign-up"].perAddress; i++) {
      await allowAuthAttempt("sign-up", school, email);
    }
    expect(await allowAuthAttempt("sign-up", school, email)).toBe(false);
    expect(await allowAuthAttempt("password-reset", school, email)).toBe(true);
    expect(await allowAuthAttempt("resend-confirmation", school, email)).toBe(true);
    expect(await allowAuthAttempt("sign-in", school, email)).toBe(true);
  });

  it("caps the mail an address can be sent again", async () => {
    const school = from(uid());
    const email = address();
    for (let i = 0; i < AUTH_BUDGETS["resend-confirmation"].perAddress; i++) {
      expect(await allowAuthAttempt("resend-confirmation", school, email)).toBe(true);
    }
    expect(await allowAuthAttempt("resend-confirmation", school, email)).toBe(false);
  });

  it("still stops one network spraying through many accounts", async () => {
    const source = from(uid());
    for (let i = 0; i < AUTH_BUDGETS["sign-in"].perNetwork; i++) {
      await recordSignInFailure(source, address());
    }
    expect(await allowAuthAttempt("sign-in", source, address())).toBe(false);
  });
});

describe("auth budgets - Redis outage", () => {
  it("allows authentication when the configured Redis request rejects", async () => {
    rejectNextLimit = true;
    const logError = vi.spyOn(logger, "error").mockImplementation(() => undefined);

    const allowed = await allowAuthAttempt("sign-up", from("203.0.113.8"), address());

    expect(allowed).toBe(true);
    expect(logError).toHaveBeenCalled();
    logError.mockRestore();
  });

  it("gives up rather than holding the sign-in when Redis never answers", async () => {
    // The failure that matters is not a rejection - that comes back at once -
    // but a request that hangs. Without a cap the password check waits behind
    // it, so this asserts the wait is bounded, not merely that it ends.
    hangNextLimit = true;
    const logError = vi.spyOn(logger, "error").mockImplementation(() => undefined);

    const startedAt = Date.now();
    const allowed = await allowAuthAttempt("sign-in", from("203.0.113.9"), address());
    const elapsed = Date.now() - startedAt;

    expect(allowed).toBe(true);
    expect(elapsed).toBeLessThan(2_000);
    expect(logError).toHaveBeenCalled();
    logError.mockRestore();
  });

  it("does not hold a refused password's answer either", async () => {
    hangNextLimit = true;
    const logError = vi.spyOn(logger, "error").mockImplementation(() => undefined);

    const startedAt = Date.now();
    await recordSignInFailure(from("203.0.113.10"), address());

    expect(Date.now() - startedAt).toBeLessThan(2_000);
    expect(logError).toHaveBeenCalled();
    logError.mockRestore();
  });
});
