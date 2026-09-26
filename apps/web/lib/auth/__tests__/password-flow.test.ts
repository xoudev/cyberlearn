import { describe, expect, it, vi } from "vitest";

/**
 * When a sign-in must stop at the MFA challenge. Fail-closed: an error or no
 * answer asks for it, and so does any level the session can reach but does not
 * hold - not only "aal2", which is all the check used to name.
 */

vi.mock("@cyberlearn/db", () => ({ userRepository: {} }));

const { needsMfaStep } = await import("../password-flow");

const levels = (currentLevel: string | null, nextLevel: string | null) => ({
  data: { currentLevel, nextLevel },
  error: null,
});

describe("needsMfaStep", () => {
  it("asks for the challenge when a factor is enrolled and not yet verified", () => {
    expect(needsMfaStep(levels("aal1", "aal2"))).toBe(true);
  });

  it("lets through a session that holds the level it can reach", () => {
    expect(needsMfaStep(levels("aal1", "aal1"))).toBe(false);
    expect(needsMfaStep(levels("aal2", "aal2"))).toBe(false);
  });

  it("asks for it for a level added later, rather than letting it through", () => {
    expect(needsMfaStep(levels("aal2", "aal3"))).toBe(true);
  });

  it("asks for it when Supabase errs or answers nothing", () => {
    expect(needsMfaStep({ data: null, error: new Error("network") })).toBe(true);
    expect(needsMfaStep({ data: null, error: null })).toBe(true);
  });
});
