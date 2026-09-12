import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { isProtectedRoute, middleware } from "./middleware";

afterEach(() => vi.unstubAllEnvs());

describe("OAuth Site URL fallback", () => {
  it("routes a landing-page code through the callback before session checks", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
    const response = await middleware(
      new NextRequest("https://cyberlearn.fr/?code=test-code&next=%2Fsettings"),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://cyberlearn.fr/auth/callback?code=test-code&next=%2Fsettings",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("keeps the callback on the incoming origin even with an untrusted next parameter", async () => {
    const response = await middleware(
      new NextRequest("https://www.cyberlearn.fr/?code=test-code&next=https://evil.example"),
    );
    const destination = new URL(response.headers.get("location") ?? "");
    expect(destination.origin).toBe("https://www.cyberlearn.fr");
    expect(destination.pathname).toBe("/auth/callback");
  });

  it.each(["/", "/?campaign=github", "/auth/callback?code=test-code", "/u/demo?code=test-code"])(
    "does not redirect ordinary pages or loop on %s",
    async (path) => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
      const response = await middleware(new NextRequest(`https://cyberlearn.fr${path}`));
      expect(response.headers.get("location")).toBeNull();
    },
  );
});

describe("protected route classification", () => {
  it.each(["/dashboard", "/lessons/python", "/paths/linux", "/settings/account"])(
    "protects known application route %s",
    (path) => {
      expect(isProtectedRoute(path)).toBe(true);
    },
  );

  it.each(["/catalogue", "/contact", "/page-inconnue", "/u/introuvable"])(
    "lets Next render public and unknown route %s",
    (path) => {
      expect(isProtectedRoute(path)).toBe(false);
    },
  );
});
