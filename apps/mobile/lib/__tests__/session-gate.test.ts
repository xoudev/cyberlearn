import { describe, expect, it } from "vitest";
import { assuranceView, sessionGateRedirect } from "../session-gate";

const session = (userId: string, accessToken: string) => ({ userId, accessToken });
const assessed = (userId: string, accessToken: string, mfaRequired: boolean) => ({
  userId,
  accessToken,
  mfaRequired,
});

describe("assuranceView", () => {
  it("holds the screens back until an account's first check answers", () => {
    expect(assuranceView(session("u-1", "t-1"), null)).toEqual({
      pending: true,
      stale: false,
      mfaRequired: true,
    });
  });

  it("holds them back again for another account", () => {
    expect(assuranceView(session("u-2", "t-9"), assessed("u-1", "t-1", false)).pending).toBe(true);
  });

  it("keeps the screens mounted when the same account gets a new token", () => {
    // A refresh, or the code that was just verified: nothing to unmount.
    expect(assuranceView(session("u-1", "t-2"), assessed("u-1", "t-1", false))).toEqual({
      pending: false,
      stale: true,
      mfaRequired: false,
    });
  });

  it("carries the last answer while the new token is checked", () => {
    expect(assuranceView(session("u-1", "t-2"), assessed("u-1", "t-1", true))).toEqual({
      pending: false,
      stale: true,
      mfaRequired: true,
    });
  });

  it("is current once the answer is for the token in use", () => {
    expect(assuranceView(session("u-1", "t-1"), assessed("u-1", "t-1", false))).toEqual({
      pending: false,
      stale: false,
      mfaRequired: false,
    });
  });

  it("has nothing to check without a session", () => {
    expect(assuranceView(null, assessed("u-1", "t-1", true))).toEqual({
      pending: false,
      stale: false,
      mfaRequired: false,
    });
  });
});

describe("sessionGateRedirect", () => {
  const signedOut = { hasSession: false, mfaRequired: false };

  it("sends a signed-out visitor to the sign-in screen", () => {
    expect(sessionGateRedirect({ ...signedOut, inAuth: false, pathname: "/home" })).toBe("/login");
  });

  it("leaves a signed-out visitor on the sign-in screens", () => {
    expect(sessionGateRedirect({ ...signedOut, inAuth: true, pathname: "/login" })).toBeNull();
    expect(sessionGateRedirect({ ...signedOut, inAuth: true, pathname: "/register" })).toBeNull();
  });

  it("takes a session signed out from the code screen to the sign-in screen", () => {
    expect(sessionGateRedirect({ ...signedOut, inAuth: true, pathname: "/mfa" })).toBe("/login");
  });

  it("sends a session that owes its code to the code screen, and keeps it there", () => {
    const owing = { hasSession: true, mfaRequired: true };
    expect(sessionGateRedirect({ ...owing, inAuth: false, pathname: "/home" })).toBe("/mfa");
    expect(sessionGateRedirect({ ...owing, inAuth: true, pathname: "/login" })).toBe("/mfa");
    expect(sessionGateRedirect({ ...owing, inAuth: true, pathname: "/mfa" })).toBeNull();
  });

  it("sends a signed-in session out of the sign-in screens, and leaves it alone elsewhere", () => {
    const signedIn = { hasSession: true, mfaRequired: false };
    expect(sessionGateRedirect({ ...signedIn, inAuth: true, pathname: "/mfa" })).toBe("signed-in");
    expect(sessionGateRedirect({ ...signedIn, inAuth: true, pathname: "/login" })).toBe(
      "signed-in",
    );
    expect(sessionGateRedirect({ ...signedIn, inAuth: false, pathname: "/security" })).toBeNull();
  });
});
