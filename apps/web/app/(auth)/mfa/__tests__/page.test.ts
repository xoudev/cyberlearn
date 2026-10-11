import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /mfa asks for a code only when there is a verified factor to check it
 * against. When the middleware cannot read the assurance level in time it
 * sends everybody here, and an account without TOTP used to meet a code form
 * it could never satisfy.
 */

const getUser = vi.fn();
const getAuthenticatorAssuranceLevel = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () =>
    Promise.resolve({ auth: { getUser, mfa: { getAuthenticatorAssuranceLevel } } }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
vi.mock("../mfa-challenge-form", () => ({ MfaChallengeForm: () => null }));

const { default: MfaPage } = await import("../page");

function open(next?: string): Promise<unknown> {
  return MfaPage({ searchParams: Promise.resolve(next === undefined ? {} : { next }) });
}

function assurance(currentLevel: string, nextLevel: string): void {
  getAuthenticatorAssuranceLevel.mockResolvedValue({
    data: { currentLevel, nextLevel },
    error: null,
  });
}

beforeEach(() => {
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

describe("/mfa", () => {
  it("asks for the code of an account with a verified factor", async () => {
    assurance("aal1", "aal2");
    await expect(open("/paths")).resolves.toBeTruthy();
  });

  it("sends a session that already passed the step on", async () => {
    assurance("aal2", "aal2");
    await expect(open("/paths")).rejects.toThrow("REDIRECT /paths");
  });

  it("sends an account without a verified factor on, instead of a code it cannot give", async () => {
    assurance("aal1", "aal1");
    await expect(open("/paths")).rejects.toThrow("REDIRECT /paths");
  });

  it("falls back to the dashboard for a destination off the site", async () => {
    assurance("aal1", "aal1");
    await expect(open("//evil.example")).rejects.toThrow("REDIRECT /dashboard");
  });

  it("keeps the form when the level cannot be read", async () => {
    getAuthenticatorAssuranceLevel.mockResolvedValue({ data: null, error: new Error("timeout") });
    await expect(open()).resolves.toBeTruthy();
  });
});
