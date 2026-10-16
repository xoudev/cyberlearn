/**
 * What the console refuses to do to an account. These are the rules that keep
 * an administrator from locking themselves, or everybody, out of the console,
 * and from removing another administrator's second factor with one session.
 */

import { describe, expect, it } from "vitest";
import {
  ADMIN_MFA_REFUSAL,
  LAST_ADMIN_REFUSAL,
  RECENT_ADMIN_DAYS,
  RECENT_ADMIN_MFA_REFUSAL,
  banRefusal,
  mfaResetRefusal,
  recentAdminSince,
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
    expect(
      mfaResetRefusal({ actorId: ME, targetId: ME, targetRole: "ADMIN", wasRecentlyAdmin: true }),
    ).toMatch(/ta propre double authentification/u);
  });

  it("refuses a reset on another administrator and points to the break-glass procedure", () => {
    expect(
      mfaResetRefusal({
        actorId: ME,
        targetId: SOMEONE,
        targetRole: "ADMIN",
        wasRecentlyAdmin: false,
      }),
    ).toBe(ADMIN_MFA_REFUSAL);
    expect(ADMIN_MFA_REFUSAL).toContain("docs/authentication.md");
  });

  it.each(["STUDENT", "TEACHER"] as const)(
    "refuses a reset on a %s who was an administrator in the window",
    (targetRole) => {
      // Demote, reset, promote back: three gestures from one stolen session
      // would otherwise get round the refusal above.
      expect(
        mfaResetRefusal({ actorId: ME, targetId: SOMEONE, targetRole, wasRecentlyAdmin: true }),
      ).toBe(RECENT_ADMIN_MFA_REFUSAL);
      expect(RECENT_ADMIN_MFA_REFUSAL).toContain("docs/authentication.md");
      expect(RECENT_ADMIN_MFA_REFUSAL).toContain(`${String(RECENT_ADMIN_DAYS)} jours`);
    },
  );

  it.each(["STUDENT", "TEACHER"] as const)("allows a reset on a %s", (targetRole) => {
    expect(
      mfaResetRefusal({ actorId: ME, targetId: SOMEONE, targetRole, wasRecentlyAdmin: false }),
    ).toBeNull();
  });
});

describe("banRefusal", () => {
  // One rule for the account's page and the moderation queue: the queue used
  // to ban an administrator's account, its own moderator's included.
  it("refuses banning oneself, whatever the role", () => {
    expect(banRefusal({ actorId: ME, targetId: ME, targetRole: "ADMIN" })).toMatch(/toi-même/u);
  });

  it("refuses banning an administrator, and says what to do first", () => {
    expect(banRefusal({ actorId: ME, targetId: SOMEONE, targetRole: "ADMIN" })).toMatch(
      /rôle administrateur/u,
    );
  });

  it.each(["STUDENT", "TEACHER"] as const)("lets a %s be banned", (targetRole) => {
    expect(banRefusal({ actorId: ME, targetId: SOMEONE, targetRole })).toBeNull();
  });
});

describe("recentAdminSince", () => {
  it("counts the window back from now", () => {
    expect(recentAdminSince(new Date("2026-10-11T12:00:00Z"))).toEqual(
      new Date("2026-09-11T12:00:00Z"),
    );
  });
});
