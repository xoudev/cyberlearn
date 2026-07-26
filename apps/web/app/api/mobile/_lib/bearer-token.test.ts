import { describe, expect, it } from "vitest";
import { readAuthenticatorAssuranceLevel, sessionMeetsMfaRequirement } from "./bearer-token";

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
