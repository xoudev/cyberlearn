/**
 * How the account page reads somebody's way in from Supabase Auth: the
 * confirmation, the sign-in methods and the second factors, finished or not.
 * A Supabase that does not answer has to read as "unknown", never as "no
 * second factor".
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserById = vi.fn();
const listFactors = vi.fn();
vi.mock("@cyberlearn/db/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    auth: { admin: { getUserById, mfa: { listFactors } } },
  }),
}));
vi.mock("@cyberlearn/lib/logger", () => ({
  logger: { error: vi.fn() },
  errorMessage: (error: unknown) => String(error),
}));

const { readSignInState, toSignInState, totpTally } = await import("../sign-in-state");

const USER = {
  email_confirmed_at: "2026-09-01T08:00:00Z",
  last_sign_in_at: "2026-10-10T18:30:00Z",
  identities: [
    { provider: "github" },
    { provider: "email" },
    // Two GitHub identities still count as one way in.
    { provider: "github" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("totpTally", () => {
  it("separates finished factors from abandoned enrolments, and ignores phone", () => {
    expect(
      totpTally([
        { factor_type: "totp", status: "verified" },
        { factor_type: "totp", status: "unverified" },
        { factor_type: "phone", status: "verified" },
      ]),
    ).toEqual({ verified: 1, pending: 1 });
  });
});

describe("toSignInState", () => {
  it("maps dates, providers and factors", () => {
    const state = toSignInState(USER, [{ factor_type: "totp", status: "verified" }]);
    expect(state).toEqual({
      status: "ok",
      emailConfirmedAt: new Date("2026-09-01T08:00:00Z"),
      lastSignInAt: new Date("2026-10-10T18:30:00Z"),
      providers: ["email", "github"],
      verifiedTotp: 1,
      pendingTotp: 0,
    });
  });

  it("reads an address never confirmed and an account never signed in as null", () => {
    const state = toSignInState({ identities: [] }, []);
    expect(state).toMatchObject({ emailConfirmedAt: null, lastSignInAt: null, providers: [] });
  });
});

describe("readSignInState", () => {
  it("reads the account and its factors", async () => {
    getUserById.mockResolvedValue({ data: { user: USER }, error: null });
    listFactors.mockResolvedValue({
      data: { factors: [{ factor_type: "totp", status: "unverified" }] },
      error: null,
    });
    await expect(readSignInState("u-1")).resolves.toMatchObject({
      status: "ok",
      verifiedTotp: 0,
      pendingTotp: 1,
    });
    expect(listFactors).toHaveBeenCalledWith({ userId: "u-1" });
  });

  it("says when no auth identity stands behind the profile", async () => {
    getUserById.mockResolvedValue({ data: { user: null }, error: { status: 404 } });
    listFactors.mockResolvedValue({ data: { factors: [] }, error: null });
    await expect(readSignInState("u-1")).resolves.toEqual({ status: "missing" });
  });

  it("says it does not know when Supabase fails, rather than reporting no factor", async () => {
    getUserById.mockResolvedValue({ data: { user: USER }, error: null });
    listFactors.mockResolvedValue({ data: null, error: { status: 500, message: "down" } });
    await expect(readSignInState("u-1")).resolves.toEqual({ status: "unavailable" });
  });
});
