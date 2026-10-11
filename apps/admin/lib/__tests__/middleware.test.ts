import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** What the mocked Supabase client reports. Set per test. */
interface MockAuth {
  user: { id: string } | null;
  assurance: { currentLevel: string; nextLevel: string };
  /**
   * How Supabase fails to answer. `unreachable` is what supabase-js resolves
   * a network failure or a 5xx to (it does not reject); `stalled` never
   * answers at all.
   */
  failure: "none" | "unreachable" | "stalled";
  getUserCalls: number;
}
const auth = vi.hoisted(
  (): MockAuth => ({
    user: null,
    assurance: { currentLevel: "aal1", nextLevel: "aal1" },
    failure: "none",
    getUserCalls: 0,
  }),
);

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: () => {
        auth.getUserCalls += 1;
        if (auth.failure === "stalled") return new Promise(() => undefined);
        if (auth.failure === "unreachable") {
          return Promise.resolve({
            data: { user: null },
            error: new AuthRetryableFetchError("fetch failed", 0),
          });
        }
        return Promise.resolve({ data: { user: auth.user }, error: null });
      },
      mfa: {
        getAuthenticatorAssuranceLevel: () =>
          Promise.resolve({ data: auth.assurance, error: null }),
      },
    },
  }),
}));

const { middleware, isPublicPath } = await import("../../middleware");

/** A Supabase session cookie, as the browser holds one once signed in. */
const SESSION_COOKIE = { cookie: "sb-project-auth-token=base64-session" };

function request(path: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`https://admin.cyberlearn.fr${path}`, { headers });
}

/** Where a response sends the browser, path and query, or null when it does not. */
function target(response: Response): string | null {
  const location = response.headers.get("location");
  if (location === null) return null;
  const url = new URL(location);
  return `${url.pathname}${url.search}`;
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  auth.user = null;
  auth.assurance = { currentLevel: "aal1", nextLevel: "aal1" };
  auth.failure = "none";
  auth.getUserCalls = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("the console's front door", () => {
  it("lets the sign-in page through without a session", async () => {
    const response = await middleware(request("/login"));
    expect(response.headers.get("location")).toBeNull();
    expect(isPublicPath("/login")).toBe(true);
  });

  it("sends an anonymous page request to /login", async () => {
    const response = await middleware(request("/users"));
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/login");
  });

  // The request that got past the layout: a client navigation claiming the
  // (admin) layout is already on screen. The door does not care what it claims.
  it("sends an anonymous RSC navigation to /login too", async () => {
    const tree = encodeURIComponent(
      JSON.stringify([
        "",
        { children: ["(admin)", { children: ["dashboard", { children: ["__PAGE__", {}] }] }] },
      ]),
    );
    const response = await middleware(
      request("/users?_rsc=abc", { RSC: "1", "Next-Router-State-Tree": tree }),
    );
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/login");
  });

  it("closes the door when Supabase is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const response = await middleware(request("/dashboard"));
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/login");
  });

  it("sends a session without a TOTP factor to enrol", async () => {
    auth.user = { id: "u1" };
    const response = await middleware(request("/dashboard"));
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/mfa/setup");
  });

  it("sends a session that has a factor but skipped the code to /mfa", async () => {
    auth.user = { id: "u1" };
    auth.assurance = { currentLevel: "aal1", nextLevel: "aal2" };
    const response = await middleware(request("/users"));
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/mfa");
  });

  it("lets a session reach /mfa to type its code", async () => {
    auth.user = { id: "u1" };
    auth.assurance = { currentLevel: "aal1", nextLevel: "aal2" };
    const response = await middleware(request("/mfa"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("lets a verified session through, under a nonce-based policy", async () => {
    auth.user = { id: "u1" };
    auth.assurance = { currentLevel: "aal2", nextLevel: "aal2" };
    const response = await middleware(request("/users"));
    expect(response.headers.get("location")).toBeNull();
    const csp = response.headers.get("content-security-policy") ?? "";
    expect(csp).toMatch(/script-src 'nonce-[^']+' 'strict-dynamic'/);
    const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src")) ?? "";
    expect(scriptSrc).not.toContain("unsafe-inline");
    expect(scriptSrc).not.toContain("unsafe-eval");
  });

  it("lets the console frame the learner site, for the editor's preview, and nothing else", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://cyberlearn.fr/");
    auth.user = { id: "u1" };
    auth.assurance = { currentLevel: "aal2", nextLevel: "aal2" };
    const response = await middleware(request("/lessons/new"));
    const csp = response.headers.get("content-security-policy") ?? "";
    const frameSrc = csp
      .split(";")
      .find((d) => d.trim().startsWith("frame-src"))
      ?.trim();
    expect(frameSrc).toBe("frame-src 'self' https://cyberlearn.fr");
    // The console itself is never framed.
    expect(csp).toContain("frame-ancestors 'none'");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });
});

describe("the page that was asked for, kept through sign-in", () => {
  it("sends an anonymous deep link to /login with the page to come back to", async () => {
    const response = await middleware(request("/users/u-42?tab=bans"));
    expect(target(response)).toBe(
      `/login?redirectTo=${encodeURIComponent("/users/u-42?tab=bans")}`,
    );
  });

  it("keeps /login bare when the page was the dashboard anyway", async () => {
    expect(target(await middleware(request("/dashboard")))).toBe("/login");
    expect(target(await middleware(request("/")))).toBe("/login");
  });

  it("drops the router's cache key from a refused RSC request", async () => {
    const response = await middleware(request("/tickets?_rsc=abc", { RSC: "1" }));
    expect(target(response)).toBe(`/login?redirectTo=${encodeURIComponent("/tickets")}`);
  });

  it("carries the page to /mfa as next", async () => {
    auth.user = { id: "u1" };
    auth.assurance = { currentLevel: "aal1", nextLevel: "aal2" };
    const response = await middleware(request("/tickets/t-7"));
    expect(target(response)).toBe(`/mfa?next=${encodeURIComponent("/tickets/t-7")}`);
  });

  it("carries the page to the enrolment as next", async () => {
    auth.user = { id: "u1" };
    const response = await middleware(request("/audit"));
    expect(target(response)).toBe(`/mfa/setup?next=${encodeURIComponent("/audit")}`);
  });

  it("keeps the next of an MFA screen when the session behind it is gone", async () => {
    const response = await middleware(request("/mfa?next=%2Fusers"));
    expect(target(response)).toBe(`/login?redirectTo=${encodeURIComponent("/users")}`);
  });

  it("refuses to carry a destination off the console", async () => {
    const response = await middleware(request("/mfa?next=%2F%2Fevil.example"));
    expect(target(response)).toBe("/login");
  });
});

describe("the sign-in page, for somebody already signed in", () => {
  it("renders for a visitor without asking Supabase anything", async () => {
    const response = await middleware(request("/login"));
    expect(response.headers.get("location")).toBeNull();
    expect(auth.getUserCalls).toBe(0);
  });

  it("sends a session that passed the TOTP step to the dashboard", async () => {
    auth.user = { id: "u1" };
    auth.assurance = { currentLevel: "aal2", nextLevel: "aal2" };
    expect(target(await middleware(request("/login", SESSION_COOKIE)))).toBe("/dashboard");
  });

  it("sends it where it was going, when that was said", async () => {
    auth.user = { id: "u1" };
    auth.assurance = { currentLevel: "aal2", nextLevel: "aal2" };
    const response = await middleware(
      request("/login?redirectTo=%2Fusers%3Frole%3DADMIN", SESSION_COOKIE),
    );
    expect(target(response)).toBe("/users?role=ADMIN");
  });

  it("ignores a destination off the console", async () => {
    auth.user = { id: "u1" };
    auth.assurance = { currentLevel: "aal2", nextLevel: "aal2" };
    const response = await middleware(
      request("/login?redirectTo=https%3A%2F%2Fevil.example", SESSION_COOKIE),
    );
    expect(target(response)).toBe("/dashboard");
  });

  it("still shows the form to a session that has not typed its code", async () => {
    auth.user = { id: "u1" };
    auth.assurance = { currentLevel: "aal1", nextLevel: "aal2" };
    const response = await middleware(request("/login", SESSION_COOKIE));
    expect(response.headers.get("location")).toBeNull();
  });
});

describe("why /login was reached", () => {
  it("says the session ran out when a session cookie was refused", async () => {
    const response = await middleware(request("/users", SESSION_COOKIE));
    expect(target(response)).toBe(
      `/login?redirectTo=${encodeURIComponent("/users")}&error=session_expired`,
    );
  });

  it("says the auth service is unreachable when it is", async () => {
    auth.failure = "unreachable";
    const response = await middleware(request("/users", SESSION_COOKIE));
    expect(target(response)).toBe(
      `/login?redirectTo=${encodeURIComponent("/users")}&error=auth_unavailable`,
    );
  });

  it("says so too when the auth service does not answer in time", async () => {
    vi.useFakeTimers();
    auth.failure = "stalled";
    const pending = middleware(request("/dashboard", SESSION_COOKIE));
    await vi.advanceTimersByTimeAsync(4000);
    expect(target(await pending)).toBe("/login?error=auth_unavailable");
  });

  it("says nothing on a first visit", async () => {
    expect(target(await middleware(request("/users")))).toBe(
      `/login?redirectTo=${encodeURIComponent("/users")}`,
    );
  });
});
