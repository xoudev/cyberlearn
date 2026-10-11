/**
 * What the console refuses to do to an account. These are the rules that keep
 * an administrator from locking themselves, or everybody, out of the console,
 * and from removing another administrator's second factor with one session.
 */

import { describe, expect, it } from "vitest";
import {
  ADMIN_MFA_REFUSAL,
  LAST_ADMIN_REFUSAL,
  mfaResetRefusal,
  roleChangeRefusal,
} from "../account-guards";

const ME = "11111111-1111-4111-8111-111111111111";
const SOMEONE = "22222222-2222-4222-8222-222222222222";

describe("roleChangeRefusal", () => {
  it.each(["STUDENT", "TEACHER"] as const)("refuses demoting oneself to %s", (newRole) => {
    expect(roleChangeRefusal({ actorId: ME, targetId: ME, newRole })).toMatch(
      /propre rôle d'administrateur/u,
    );
  });

  it("lets an administrator re-pick their own role, which changes nothing", () => {
    expect(roleChangeRefusal({ actorId: ME, targetId: ME, newRole: "ADMIN" })).toBeNull();
  });

  it.each(["STUDENT", "TEACHER", "ADMIN"] as const)("lets another account become %s", (newRole) => {
    expect(roleChangeRefusal({ actorId: ME, targetId: SOMEONE, newRole })).toBeNull();
  });

  it("names a way out for the last administrator", () => {
    expect(LAST_ADMIN_REFUSAL).toMatch(/dernier administrateur/u);
    expect(LAST_ADMIN_REFUSAL).toMatch(/autre compte/u);
  });
});

describe("mfaResetRefusal", () => {
  it("refuses a reset on oneself", () => {
    expect(mfaResetRefusal({ actorId: ME, targetId: ME, targetRole: "ADMIN" })).toMatch(
      /ta propre double authentification/u,
    );
  });

  it("refuses a reset on another administrator and points to the break-glass procedure", () => {
    expect(mfaResetRefusal({ actorId: ME, targetId: SOMEONE, targetRole: "ADMIN" })).toBe(
      ADMIN_MFA_REFUSAL,
    );
    expect(ADMIN_MFA_REFUSAL).toContain("docs/authentication.md");
  });

  it.each(["STUDENT", "TEACHER"] as const)("allows a reset on a %s", (targetRole) => {
    expect(mfaResetRefusal({ actorId: ME, targetId: SOMEONE, targetRole })).toBeNull();
  });
});
