import { describe, expect, it } from "vitest";
import {
  badgeGrantOutcome,
  badgeRevokeOutcome,
  grantableBadges,
  signedXp,
  streakCorrectionOutcome,
  xpAdjustmentOutcome,
} from "../gamification-corrections";

/**
 * The sentences the XP, streak and badge corrections answer with: what was
 * done, in figures, and why nothing was when nothing was.
 */

/** fr-FR groups thousands with a narrow no-break space. */
const thousands = (value: number): string => new Intl.NumberFormat("fr-FR").format(value);

describe("signedXp", () => {
  it("signs a gain and a loss, the loss with a real minus sign", () => {
    expect(signedXp(50)).toBe("+50 XP");
    expect(signedXp(-50)).toBe("−50 XP");
    expect(signedXp(1200)).toBe(`+${thousands(1200)} XP`);
  });
});

describe("grantableBadges", () => {
  it("keeps the active badges the account does not hold, in their order", () => {
    const active = [
      { id: "a", name: "A", xpReward: 10 },
      { id: "b", name: "B", xpReward: 20 },
      { id: "c", name: "C", xpReward: 30 },
    ];
    expect(grantableBadges(active, [{ badgeId: "b" }]).map((badge) => badge.id)).toEqual([
      "a",
      "c",
    ]);
    expect(grantableBadges(active, [])).toHaveLength(3);
  });
});

describe("xpAdjustmentOutcome", () => {
  it("gives the totals and the levels before and after", () => {
    const outcome = xpAdjustmentOutcome({
      ok: true,
      requested: 300,
      applied: 300,
      before: { xpTotal: 320, level: 3 },
      after: { xpTotal: 620, level: 4 },
    });
    expect(outcome).toEqual({
      ok: true,
      notice: expect.stringContaining("+300 XP : 320 → 620 XP, niveau 3 → 4.") as unknown,
    });
  });

  it("says when the total reached zero before the whole amount came off", () => {
    const outcome = xpAdjustmentOutcome({
      ok: true,
      requested: -500,
      applied: -320,
      before: { xpTotal: 320, level: 3 },
      after: { xpTotal: 0, level: 1 },
    });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.notice).toContain("−320 XP seulement, sur −500 XP demandés");
    }
  });

  it("explains a refusal", () => {
    expect(xpAdjustmentOutcome({ ok: false, reason: "NOTHING_TO_TAKE_BACK" })).toEqual({
      ok: false,
      error: "Ce compte n'a pas d'XP à retirer : son total est déjà à zéro.",
    });
    expect(xpAdjustmentOutcome({ ok: false, reason: "NO_USER" })).toEqual({
      ok: false,
      error: "Ce compte n'existe plus.",
    });
  });
});

describe("streakCorrectionOutcome", () => {
  it("names what moved: the streak, the record, the freezes", () => {
    const outcome = streakCorrectionOutcome({
      ok: true,
      before: { streakDays: 0, longestStreak: 10, streakFreezes: 0 },
      after: { streakDays: 12, longestStreak: 12, streakFreezes: 2 },
      movedToToday: true,
    });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.notice).toMatch(
        /^Série corrigée : 0 → 12 jours, record 10 → 12, gels 0 → 2\./u,
      );
      expect(outcome.notice).toContain("Aujourd'hui compte comme jour actif");
    }
  });

  it("leaves out what did not move", () => {
    const outcome = streakCorrectionOutcome({
      ok: true,
      before: { streakDays: 4, longestStreak: 10, streakFreezes: 1 },
      after: { streakDays: 1, longestStreak: 10, streakFreezes: 1 },
      movedToToday: false,
    });
    expect(outcome).toEqual({ ok: true, notice: "Série corrigée : 4 → 1 jour." });
  });

  it("explains a correction with nothing to correct", () => {
    expect(streakCorrectionOutcome({ ok: false, reason: "UNCHANGED" })).toEqual({
      ok: false,
      error: "Rien à corriger : la série a déjà ces valeurs.",
    });
  });
});

describe("badge outcomes", () => {
  it("says a granted badge paid its XP and notified the learner", () => {
    expect(badgeGrantOutcome({ ok: true, badgeName: "Premier pas", xpCredited: 50 })).toEqual({
      ok: true,
      notice:
        "Badge « Premier pas » attribué, +50 XP. La personne a reçu la notification d'un badge obtenu.",
    });
    expect(badgeGrantOutcome({ ok: false, reason: "ALREADY_EARNED" })).toEqual({
      ok: false,
      error: "Ce compte a déjà ce badge.",
    });
  });

  it("says whether a revoked badge took its XP back", () => {
    const taken = badgeRevokeOutcome({ ok: true, badgeName: "Premier pas", xpTakenBack: 50 }, true);
    expect(taken).toEqual({
      ok: true,
      notice: "Badge « Premier pas » retiré. −50 XP : les XP qu'il avait rapportés sont repris.",
    });

    const kept = badgeRevokeOutcome({ ok: true, badgeName: "Premier pas", xpTakenBack: 0 }, false);
    expect(kept.ok && kept.notice).toContain("restent acquis");

    const unpaid = badgeRevokeOutcome({ ok: true, badgeName: "Ancien", xpTakenBack: 0 }, true);
    expect(unpaid.ok && unpaid.notice).toContain("aucun XP à reprendre");

    expect(badgeRevokeOutcome({ ok: false, reason: "NOT_EARNED" }, true)).toEqual({
      ok: false,
      error: "Ce compte n'a pas, ou plus, ce badge.",
    });
  });
});
