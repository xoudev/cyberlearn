import { describe, expect, it } from "vitest";
import {
  hasRecentRecovery,
  readAuthenticatorAssuranceLevel,
  sessionMeetsMfaRequirement,
} from "./bearer-token";

function jwt(payload: Record<string, unknown>): string {
  return `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
}

describe("readAuthenticatorAssuranceLevel", () => {
  it("reads a valid AAL claim", () => {
    expect(readAuthenticatorAssuranceLevel(jwt({ aal: "aal2" }))).toBe("aal2");
  });

  it("rejects malformed or unsupported claims", () => {
    expect(readAuthenticatorAssuranceLevel("invalid")).toBeNull();
    expect(readAuthenticatorAssuranceLevel(jwt({ aal: "aal3" }))).toBeNull();
  });
});

describe("sessionMeetsMfaRequirement", () => {
  it("allows AAL1 when the account has no verified factor", () => {
    expect(sessionMeetsMfaRequirement(jwt({ aal: "aal1" }), [])).toBe(true);
  });

  it("rejects AAL1 when the account has a verified factor", () => {
    expect(sessionMeetsMfaRequirement(jwt({ aal: "aal1" }), [{ status: "verified" }])).toBe(false);
  });

  it("allows AAL2 when the account has a verified factor", () => {
    expect(sessionMeetsMfaRequirement(jwt({ aal: "aal2" }), [{ status: "verified" }])).toBe(true);
  });
});

describe("hasRecentRecovery", () => {
  const NOW = 1_800_000_000;
  const MAX = 15 * 60;

  it("accepts a session opened by the recovery code within the window", () => {
    const token = jwt({ amr: [{ method: "recovery", timestamp: NOW - 60 }] });
    expect(hasRecentRecovery(token, NOW, MAX)).toBe(true);
  });

  it("keeps the grant after a TOTP step, which adds its own entry", () => {
    const token = jwt({
      aal: "aal2",
      amr: [
        { method: "totp", timestamp: NOW - 10 },
        { method: "recovery", timestamp: NOW - 120 },
      ],
    });
    expect(hasRecentRecovery(token, NOW, MAX)).toBe(true);
  });

  it("refuses a recovery older than the window, as the site's cookie expires", () => {
    const token = jwt({ amr: [{ method: "recovery", timestamp: NOW - MAX - 1 }] });
    expect(hasRecentRecovery(token, NOW, MAX)).toBe(false);
  });

  it("refuses any other way in: password, one-time code, magic link, OAuth", () => {
    for (const method of ["password", "otp", "magiclink", "oauth"]) {
      const token = jwt({ amr: [{ method, timestamp: NOW - 5 }] });
      expect(hasRecentRecovery(token, NOW, MAX)).toBe(false);
    }
  });

  it("refuses a timestamp from the future, a missing claim and a malformed token", () => {
    expect(
      hasRecentRecovery(jwt({ amr: [{ method: "recovery", timestamp: NOW + 60 }] }), NOW, MAX),
    ).toBe(false);
    expect(hasRecentRecovery(jwt({ aal: "aal1" }), NOW, MAX)).toBe(false);
    expect(hasRecentRecovery(jwt({ amr: "recovery" }), NOW, MAX)).toBe(false);
    expect(hasRecentRecovery("invalid", NOW, MAX)).toBe(false);
  });
});
