import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as RateLimit from "../rate-limit";

/**
 * The console's rate limits: the sign-in one keyed on a pseudonymized address,
 * the announcement one on the administrator. Both fail open - Redis
 * unconfigured, erroring or silent lets the request through - because the
 * gates in front of them are the password, the ADMIN role and TOTP, and a
 * dead limiter once locked every administrator out of the console.
 */

const m = vi.hoisted(() => ({
  /** Every limiter's answer, by its prefix and the key it was asked about. */
  limit: vi.fn<(prefix: string, key: string) => Promise<{ success: boolean }>>(),
  constructed: vi.fn<(prefix: string) => void>(),
  logError: vi.fn(),
}));

vi.mock("@upstash/redis", () => ({
  // A function, not an arrow: the module calls `new Redis(...)`.
  Redis: vi.fn(function () {
    return {};
  }),
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: Object.assign(
    // Returning an object from a constructor function makes it what `new` gives.
    vi.fn(function ({ prefix }: { prefix: string }) {
      m.constructed(prefix);
      return {
        limit: (key: string) => m.limit(prefix, key),
      };
    }),
    { slidingWindow: vi.fn(() => ({})) },
  ),
}));

vi.mock("@cyberlearn/lib/pseudonymize", () => ({
  pseudonymize: (value: string) => `hmac(${value})`,
}));

vi.mock("@cyberlearn/lib/logger", () => ({
  logger: { error: m.logError },
  errorMessage: (error: unknown) => (error instanceof Error ? error.message : String(error)),
}));

const ADMIN = "11111111-1111-4111-8111-111111111111";

/** The module afresh, Redis configured or not: it builds its limiters on import. */
async function load(configured: boolean): Promise<typeof RateLimit> {
  vi.resetModules();
  vi.stubEnv("UPSTASH_REDIS_REST_URL", configured ? "https://mock.upstash.io" : "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", configured ? "mock-token" : "");
  return import("../rate-limit");
}

function request(forwardedFor?: string): { headers: Headers } {
  const headers = new Headers();
  if (forwardedFor !== undefined) headers.set("x-forwarded-for", forwardedFor);
  return { headers };
}

beforeEach(() => {
  vi.clearAllMocks();
  m.limit.mockResolvedValue({ success: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("checkAnnouncementRateLimit", () => {
  it("asks the announcement limiter about this administrator, and passes its answer on", async () => {
    const { checkAnnouncementRateLimit } = await load(true);

    await expect(checkAnnouncementRateLimit(ADMIN)).resolves.toBe(true);
    m.limit.mockResolvedValue({ success: false });
    await expect(checkAnnouncementRateLimit(ADMIN)).resolves.toBe(false);

    expect(m.limit).toHaveBeenCalledWith("rl:admin:announce", ADMIN);
    expect(m.limit.mock.calls.every(([prefix]) => prefix === "rl:admin:announce")).toBe(true);
    expect(m.logError).not.toHaveBeenCalled();
  });

  it("lets the send through, and logs it, when Redis answers with an error", async () => {
    const { checkAnnouncementRateLimit } = await load(true);
    m.limit.mockRejectedValue(new Error("Redis unavailable"));

    await expect(checkAnnouncementRateLimit(ADMIN)).resolves.toBe(true);
    expect(m.logError).toHaveBeenCalledWith(
      { scope: "rate-limit", err: "Redis unavailable" },
      "announcement check failed open",
    );
  });

  it("lets the send through after a second when Redis never answers", async () => {
    vi.useFakeTimers();
    const { checkAnnouncementRateLimit } = await load(true);
    m.limit.mockReturnValue(new Promise(() => undefined));

    let settled: boolean | undefined;
    const pending = checkAnnouncementRateLimit(ADMIN).then((allowed) => {
      settled = allowed;
      return allowed;
    });

    await vi.advanceTimersByTimeAsync(999);
    expect(settled).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toBe(true);
    expect(m.logError).toHaveBeenCalledWith(
      { scope: "rate-limit", err: "announcement rate limit timed out after 1000ms" },
      "announcement check failed open",
    );
  });

  it("leaves no timer behind once Redis has answered", async () => {
    vi.useFakeTimers();
    const { checkAnnouncementRateLimit } = await load(true);

    await expect(checkAnnouncementRateLimit(ADMIN)).resolves.toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("lets the send through without asking when Redis is not configured", async () => {
    const { checkAnnouncementRateLimit } = await load(false);

    await expect(checkAnnouncementRateLimit(ADMIN)).resolves.toBe(true);
    expect(m.constructed).not.toHaveBeenCalled();
    expect(m.limit).not.toHaveBeenCalled();
  });
});

describe("checkAuthRateLimit", () => {
  it("asks the sign-in limiter about the first forwarded address, pseudonymized", async () => {
    const { checkAuthRateLimit } = await load(true);

    await expect(checkAuthRateLimit(request(" 203.0.113.7 , 10.0.0.1"))).resolves.toBe(true);
    expect(m.limit).toHaveBeenCalledWith("rl:admin:auth", "hmac(203.0.113.7)");

    m.limit.mockResolvedValue({ success: false });
    await expect(checkAuthRateLimit(request())).resolves.toBe(false);
    expect(m.limit).toHaveBeenLastCalledWith("rl:admin:auth", "hmac(unknown)");
  });

  it("fails open the same way: on an error, and after a second of silence", async () => {
    vi.useFakeTimers();
    const { checkAuthRateLimit } = await load(true);

    m.limit.mockRejectedValueOnce(new Error("Redis unavailable"));
    await expect(checkAuthRateLimit(request("203.0.113.7"))).resolves.toBe(true);

    m.limit.mockReturnValueOnce(new Promise(() => undefined));
    const pending = checkAuthRateLimit(request("203.0.113.7"));
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(pending).resolves.toBe(true);

    expect(m.logError).toHaveBeenCalledTimes(2);
    expect(m.logError).toHaveBeenLastCalledWith(
      { scope: "rate-limit", err: "auth rate limit timed out after 1000ms" },
      "auth check failed open",
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it("allows every sign-in when Redis is not configured", async () => {
    const { checkAuthRateLimit } = await load(false);

    await expect(checkAuthRateLimit(request("203.0.113.7"))).resolves.toBe(true);
    expect(m.limit).not.toHaveBeenCalled();
  });
});
