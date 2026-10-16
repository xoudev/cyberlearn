import { describe, expect, it, vi } from "vitest";
import {
  canRemoveOwnTotp,
  readTotpFactors,
  removeTotpFactors,
  type TotpRemovalClient,
} from "../mfa-factors.js";

describe("canRemoveOwnTotp", () => {
  it("never offers an administrator the removal of their own factor", () => {
    expect(canRemoveOwnTotp("ADMIN")).toBe(false);
  });

  it("offers it to every other account, with or without a profile row", () => {
    expect(canRemoveOwnTotp("STUDENT")).toBe(true);
    expect(canRemoveOwnTotp("TEACHER")).toBe(true);
    expect(canRemoveOwnTotp(null)).toBe(true);
    expect(canRemoveOwnTotp(undefined)).toBe(true);
  });
});

describe("readTotpFactors", () => {
  it("lists the verified factors with their names", () => {
    expect(
      readTotpFactors({
        data: {
          totp: [
            { id: "f-1", friendly_name: "CyberLearn Authenticator" },
            { id: "f-2", friendly_name: "  " },
            { id: "f-3" },
          ],
        },
        error: null,
      }),
    ).toEqual({
      status: "ready",
      factors: [
        { id: "f-1", friendlyName: "CyberLearn Authenticator" },
        { id: "f-2", friendlyName: null },
        { id: "f-3", friendlyName: null },
      ],
    });
  });

  it("says there is none only when Supabase answered so", () => {
    expect(readTotpFactors({ data: { totp: [] }, error: null })).toEqual({
      status: "ready",
      factors: [],
    });
  });

  it("never reads a failed question as an unprotected account", () => {
    expect(readTotpFactors({ data: null, error: new Error("network") })).toEqual({
      status: "error",
    });
    expect(readTotpFactors({ data: { totp: [] }, error: new Error("timeout") })).toEqual({
      status: "error",
    });
    expect(readTotpFactors({ data: null, error: null })).toEqual({ status: "error" });
  });
});

function client(options: { acceptedFactor?: string; failingUnenroll?: string } = {}): {
  mfa: TotpRemovalClient;
  challengeAndVerify: ReturnType<typeof vi.fn>;
  unenroll: ReturnType<typeof vi.fn>;
} {
  const challengeAndVerify = vi.fn(({ factorId }: { factorId: string; code: string }) =>
    Promise.resolve({
      error: factorId === options.acceptedFactor ? null : new Error("Invalid TOTP code"),
    }),
  );
  const unenroll = vi.fn(({ factorId }: { factorId: string }) =>
    Promise.resolve({
      error: factorId === options.failingUnenroll ? new Error("unenroll failed") : null,
    }),
  );
  return { mfa: { challengeAndVerify, unenroll }, challengeAndVerify, unenroll };
}

describe("removeTotpFactors", () => {
  it("removes nothing until a fresh code is accepted", async () => {
    const { mfa, unenroll } = client();
    await expect(removeTotpFactors(mfa, ["f-1"], "123456")).resolves.toBe("invalid_code");
    expect(unenroll).not.toHaveBeenCalled();
  });

  it("removes the factor once its code is accepted", async () => {
    const { mfa, challengeAndVerify, unenroll } = client({ acceptedFactor: "f-1" });
    await expect(removeTotpFactors(mfa, ["f-1"], "123456")).resolves.toBe("disabled");
    expect(challengeAndVerify).toHaveBeenCalledWith({ factorId: "f-1", code: "123456" });
    expect(unenroll).toHaveBeenCalledWith({ factorId: "f-1" });
  });

  it("accepts a code from any factor, and then removes all of them", async () => {
    const { mfa, unenroll } = client({ acceptedFactor: "f-2" });
    await expect(removeTotpFactors(mfa, ["f-1", "f-2"], "123456")).resolves.toBe("disabled");
    expect(unenroll.mock.calls).toEqual([[{ factorId: "f-1" }], [{ factorId: "f-2" }]]);
  });

  it("stops at the first factor that accepts the code", async () => {
    const { mfa, challengeAndVerify } = client({ acceptedFactor: "f-1" });
    await removeTotpFactors(mfa, ["f-1", "f-2"], "123456");
    expect(challengeAndVerify).toHaveBeenCalledTimes(1);
  });

  it("reports a removal Supabase refused", async () => {
    const { mfa } = client({ acceptedFactor: "f-1", failingUnenroll: "f-1" });
    await expect(removeTotpFactors(mfa, ["f-1"], "123456")).resolves.toBe("failed");
  });

  it("does not claim to have removed a factor when there was none to remove", async () => {
    const { mfa, challengeAndVerify } = client();
    await expect(removeTotpFactors(mfa, [], "123456")).resolves.toBe("failed");
    expect(challengeAndVerify).not.toHaveBeenCalled();
  });
});
