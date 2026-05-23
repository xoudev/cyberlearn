/**
 * Rate limit unit tests — mocks Upstash so no real Redis is needed in CI.
 *
 * Each check function is exercised to its N-th call (success) and N+1th (blocked).
 * Uses unique identifiers per test so in-memory counters never collide.
 */

import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Env stubs — must be set before the module is imported ────────────────────
// getRedis() reads process.env directly (not the t3-oss typed env)
vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://mock.upstash.io");
vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "mock-token");
vi.stubEnv("IP_SALT", "a-test-salt-that-is-at-least-32-characters-long");

// ── Mocks ────────────────────────────────────────────────────────────────────

// Simulate an in-memory sliding window counter per (prefix, identifier) key.
// The limit is encoded in the Ratelimit constructor options.
const counters = new Map<string, number>();

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn(() => ({})),
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

  // Static factory — encodes limit into an object the constructor reads
  (
    Ratelimit as unknown as { slidingWindow: (limit: number, window: string) => { limit: number } }
  ).slidingWindow = vi.fn((limit: number) => ({ limit }));

  return { Ratelimit };
});

// ── Ensure rate-limit runs in test (not dev) mode ───────────────────────────
// The module reads process.env.NODE_ENV at load time to set IS_DEV.
// vitest sets NODE_ENV="test" by default — IS_DEV stays false, good.

// ── Import after mocks ───────────────────────────────────────────────────────
// Dynamic import ensures the mock is registered before the module initialises.
const {
  checkMagicLinkPerEmail,
  checkMagicLinkPerIp,
  checkContactForm,
  checkQaSubmission,
  checkHintReveal,
  checkDataExport,
} = await import("@/lib/rate-limit");

// ── Helpers ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  counters.clear();
});

function uid(): string {
  return randomUUID();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("checkMagicLinkPerEmail — 5 / 10 min", () => {
  it("allows first 5 requests", async () => {
    const email = `${uid()}@example.com`;
    for (let i = 0; i < 5; i++) {
      const r = await checkMagicLinkPerEmail(email);
      expect(r.success).toBe(true);
    }
  });

  it("blocks the 6th request and returns retryAfterSeconds > 0", async () => {
    const email = `${uid()}@example.com`;
    for (let i = 0; i < 5; i++) await checkMagicLinkPerEmail(email);
    const r = await checkMagicLinkPerEmail(email);
    expect(r.success).toBe(false);
    expect(r.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("checkMagicLinkPerIp — 20 / 10 min", () => {
  it("allows first 20 requests", async () => {
    const ip = uid();
    for (let i = 0; i < 20; i++) {
      const r = await checkMagicLinkPerIp(ip);
      expect(r.success).toBe(true);
    }
  });

  it("blocks the 21st request", async () => {
    const ip = uid();
    for (let i = 0; i < 20; i++) await checkMagicLinkPerIp(ip);
    const r = await checkMagicLinkPerIp(ip);
    expect(r.success).toBe(false);
    expect(r.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("checkContactForm — 3 / 10 min", () => {
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

describe("checkQaSubmission — 5 / min", () => {
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

describe("checkHintReveal — 20 / hour", () => {
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

describe("checkDataExport — 1 / 24h", () => {
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

describe("isolation — different identifiers don't share counters", () => {
  it("two emails have independent counters", async () => {
    const emailA = `${uid()}@example.com`;
    const emailB = `${uid()}@example.com`;
    for (let i = 0; i < 5; i++) await checkMagicLinkPerEmail(emailA);
    // emailA is now blocked
    const blockedA = await checkMagicLinkPerEmail(emailA);
    expect(blockedA.success).toBe(false);
    // emailB is untouched
    const passB = await checkMagicLinkPerEmail(emailB);
    expect(passB.success).toBe(true);
  });
});

describe("email case normalization — bypass prevention", () => {
  it("Jordan@EXAMPLE.com and jordan@example.com share the same counter", async () => {
    const base = uid();
    const emailMixed = `Jordan-${base}@EXAMPLE.com`;
    const emailLower = `jordan-${base}@example.com`;
    // Exhaust the limit using mixed-case
    for (let i = 0; i < 5; i++) await checkMagicLinkPerEmail(emailMixed);
    // Lowercase variant must see the same exhausted counter
    const r = await checkMagicLinkPerEmail(emailLower);
    expect(r.success).toBe(false);
  });

  it("trailing whitespace does not create a separate counter", async () => {
    const base = uid();
    const emailClean = `user-${base}@example.com`;
    const emailPadded = `  user-${base}@example.com  `;
    for (let i = 0; i < 5; i++) await checkMagicLinkPerEmail(emailClean);
    const r = await checkMagicLinkPerEmail(emailPadded);
    expect(r.success).toBe(false);
  });
});

describe("getSalt() — missing or invalid IP_SALT throws", () => {
  // Temporarily override IP_SALT per test; restore afterward so other suites are unaffected
  it("throws when IP_SALT is not set", async () => {
    vi.stubEnv("IP_SALT", "");
    await expect(checkMagicLinkPerEmail("probe@example.com")).rejects.toThrow(
      "IP_SALT must be set",
    );
  });

  it("throws when IP_SALT is shorter than 32 chars", async () => {
    vi.stubEnv("IP_SALT", "tooshort");
    await expect(checkMagicLinkPerEmail("probe@example.com")).rejects.toThrow(
      "IP_SALT must be set",
    );
  });

  afterEach(() => {
    // Restore the salt for subsequent test suites
    vi.stubEnv("IP_SALT", "a-test-salt-that-is-at-least-32-characters-long");
    counters.clear();
  });
});

describe("fail-open — Upstash not configured", () => {
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

    const warnSpy = vi.spyOn(console, "warn").mockImplementation((): void => undefined);

    const { checkDataExport: checkDataExportFresh } = await import("@/lib/rate-limit");

    const r1 = await checkDataExportFresh(uid());
    expect(r1.success).toBe(true);
    expect(r1.limit).toBe(Infinity);
    expect(r1.remaining).toBe(Infinity);
    expect(r1.retryAfterSeconds).toBe(0);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not configured"),
    );

    // Second call — _warnedMissing flag must suppress duplicate warn
    await checkDataExportFresh(uid());
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });
});
