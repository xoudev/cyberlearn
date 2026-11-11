import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ warn: vi.fn() }));

vi.mock("@cyberlearn/lib/logger", () => ({
  errorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
  logger: { warn: m.warn },
}));

const { TURNSTILE_FIELD, clientIp, passesTurnstile, turnstileEnabled } = await import(
  "../turnstile"
);

function form(token?: string): FormData {
  const data = new FormData();
  if (token !== undefined) data.set(TURNSTILE_FIELD, token);
  return data;
}

function answer(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("turnstileEnabled", () => {
  it("needs both keys", () => {
    expect(turnstileEnabled()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    expect(turnstileEnabled()).toBe(false);
  });
});

describe("passesTurnstile", () => {
  it("lets everything through while the check is off, without asking Cloudflare", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(await passesTurnstile(form())).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a form that came without a token, without asking Cloudflare", async () => {
    expect(await passesTurnstile(form())).toBe(false);
    expect(await passesTurnstile(form(""))).toBe(false);
    expect(await passesTurnstile(form("x".repeat(3000)))).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a token Cloudflare vouches for, sent with the secret and the address", async () => {
    fetchMock.mockResolvedValue(answer({ success: true }));
    expect(await passesTurnstile(form("token"), "203.0.113.7")).toBe(true);
    const init = fetchMock.mock.calls[0]?.[1];
    const body = init?.body instanceof URLSearchParams ? init.body : new URLSearchParams();
    expect(body.get("secret")).toBe("secret");
    expect(body.get("response")).toBe("token");
    expect(body.get("remoteip")).toBe("203.0.113.7");
  });

  it("refuses a token Cloudflare refuses", async () => {
    fetchMock.mockResolvedValue(
      answer({ success: false, "error-codes": ["timeout-or-duplicate"] }),
    );
    expect(await passesTurnstile(form("token"))).toBe(false);
  });

  it("stays open, and says so, when Cloudflare does not answer", async () => {
    fetchMock.mockRejectedValue(new Error("network"));
    expect(await passesTurnstile(form("token"))).toBe(true);
    fetchMock.mockResolvedValue(answer({}, 503));
    expect(await passesTurnstile(form("token"))).toBe(true);
    fetchMock.mockResolvedValue(answer({ unexpected: 1 }));
    expect(await passesTurnstile(form("token"))).toBe(true);
    expect(m.warn).toHaveBeenCalledTimes(3);
  });
});

describe("clientIp", () => {
  it("is the first forwarded address, or nothing", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe(
      "203.0.113.7",
    );
    expect(clientIp(new Headers())).toBeUndefined();
  });
});
