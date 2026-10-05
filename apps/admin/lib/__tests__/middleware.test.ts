import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** What the mocked Supabase client reports. Set per test. */
interface MockAuth {
  user: { id: string } | null;
  assurance: { currentLevel: string; nextLevel: string };
}
const auth = vi.hoisted(
  (): MockAuth => ({
    user: null,
    assurance: { currentLevel: "aal1", nextLevel: "aal1" },
  }),
);

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: auth.user }, error: null }),
      mfa: {
        getAuthenticatorAssuranceLevel: () =>
          Promise.resolve({ data: auth.assurance, error: null }),
      },
    },
  }),
}));

const { middleware, isPublicPath } = await import("../../middleware");

function request(path: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`https://admin.cyberlearn.fr${path}`, { headers });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  auth.user = null;
  auth.assurance = { currentLevel: "aal1", nextLevel: "aal1" };
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
