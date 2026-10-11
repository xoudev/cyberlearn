import {
  AuthError,
  type AuthMFAAdminDeleteFactorParams,
  type AuthMFAAdminDeleteFactorResponse,
  type AuthMFAAdminListFactorsResponse,
  type Factor,
} from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  listTotpFactors,
  MFA_RESET_AUDIT_ACTION,
  mfaResetAuditData,
  removeFactors,
  type MfaAdminApi,
  unrecordedResetNotice,
} from "../auth/reset-mfa.js";

const USER_ID = "8b0d5c1e-2f4a-4c1b-9b7e-1f2a3b4c5d6e";

function factor(id: string, type: Factor["factor_type"], status: Factor["status"]): Factor {
  return {
    id,
    factor_type: type,
    status,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  };
}

/** The admin MFA API, answering from a fixed list of factors. */
function adminApi(factors: Factor[], refuse: ReadonlySet<string> = new Set()) {
  const listed: AuthMFAAdminListFactorsResponse = { data: { factors }, error: null };
  const api = {
    listFactors: vi.fn(() => Promise.resolve(listed)),
    deleteFactor: vi.fn(
      ({ id }: AuthMFAAdminDeleteFactorParams): Promise<AuthMFAAdminDeleteFactorResponse> =>
        Promise.resolve(
          refuse.has(id)
            ? { data: null, error: new AuthError("factor locked") }
            : { data: { id }, error: null },
        ),
    ),
  } satisfies MfaAdminApi;
  return api;
}

describe("listTotpFactors", () => {
  it("keeps the TOTP factors, verified or left unconfirmed", async () => {
    const api = adminApi([
      factor("totp-verified", "totp", "verified"),
      factor("totp-pending", "totp", "unverified"),
      factor("phone", "phone", "verified"),
    ]);
    const factors = await listTotpFactors(api, USER_ID);
    expect(factors.map((found) => found.id)).toEqual(["totp-verified", "totp-pending"]);
    expect(api.listFactors).toHaveBeenCalledWith({ userId: USER_ID });
  });

  it("stops when the factors cannot be listed", async () => {
    const refused: AuthMFAAdminListFactorsResponse = {
      data: null,
      error: new AuthError("service unavailable"),
    };
    const api: MfaAdminApi = {
      listFactors: () => Promise.resolve(refused),
      deleteFactor: () => Promise.resolve({ data: { id: "unused" }, error: null }),
    };
    await expect(listTotpFactors(api, USER_ID)).rejects.toThrow("service unavailable");
  });
});

describe("removeFactors", () => {
  it("deletes each factor of the account", async () => {
    const api = adminApi([]);
    const result = await removeFactors(api, USER_ID, ["a", "b"]);
    expect(result).toEqual({ removed: ["a", "b"], failed: [] });
    expect(api.deleteFactor).toHaveBeenCalledWith({ id: "a", userId: USER_ID });
  });

  it("goes on past a refusal and reports it", async () => {
    const api = adminApi([], new Set(["a"]));
    const result = await removeFactors(api, USER_ID, ["a", "b"]);
    expect(result.removed).toEqual(["b"]);
    expect(result.failed).toEqual([{ id: "a", message: "factor locked" }]);
  });
});

describe("mfaResetAuditData", () => {
  it("records the reset against the account, with no console actor", () => {
    expect(
      mfaResetAuditData(USER_ID, { removed: ["a"], failed: [{ id: "b", message: "x" }] }),
    ).toEqual({
      actorId: null,
      action: MFA_RESET_AUDIT_ACTION,
      targetType: "user",
      targetId: USER_ID,
      metadata: { source: "cli", removedFactors: 1, failedFactors: 1 },
    });
  });
});

describe("unrecordedResetNotice", () => {
  const at = new Date("2026-10-11T09:30:00Z");

  it("says the factors are gone and what to record by hand", () => {
    const notice = unrecordedResetNotice(
      USER_ID,
      { removed: ["a", "b"], failed: [] },
      at,
      "connection refused",
    );
    expect(notice).toContain("2 factor(s) were removed");
    expect(notice).toContain("audit_logs row could not be written: connection refused");
    expect(notice).toContain("do not run it again");
    expect(notice).toContain(USER_ID);
    expect(notice).toContain("2026-10-11T09:30:00.000Z");
    expect(notice).toContain(MFA_RESET_AUDIT_ACTION);
  });

  it("does not claim a reset when every deletion was refused", () => {
    const notice = unrecordedResetNotice(
      USER_ID,
      { removed: [], failed: [{ id: "a", message: "factor locked" }] },
      at,
      "connection refused",
    );
    expect(notice).toContain("No factor was removed");
    expect(notice).not.toContain("do not run it again");
    expect(notice).toContain("0 removed, 1 not removed");
  });
});
