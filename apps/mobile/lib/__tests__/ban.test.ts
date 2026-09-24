import { describe, expect, it } from "vitest";
import { activeBanOf, appealProblem, banDurationLabel, type RawBanRow } from "../ban";

const NOW = new Date("2026-09-24T12:00:00.000Z");

function row(overrides: Partial<RawBanRow> = {}): RawBanRow {
  return {
    id: "ban-1",
    reason: "Insultes répétées sur le forum.",
    expiresAt: "2026-09-27T12:00:00.000Z",
    createdAt: "2026-09-20T12:00:00.000Z",
    liftedAt: null,
    acknowledgedAt: null,
    appealTicketId: null,
    ...overrides,
  };
}

describe("activeBanOf", () => {
  it("finds nothing on an account never banned", () => {
    expect(activeBanOf([], NOW)).toBeNull();
  });

  it("reads a ban in force, with its end and what was done about it", () => {
    expect(
      activeBanOf([row({ acknowledgedAt: "2026-09-20T13:00:00Z", appealTicketId: "t-1" })], NOW),
    ).toEqual({
      id: "ban-1",
      reason: "Insultes répétées sur le forum.",
      expiresAt: new Date("2026-09-27T12:00:00.000Z"),
      createdAt: new Date("2026-09-20T12:00:00.000Z"),
      acknowledged: true,
      appealed: true,
    });
  });

  it("keeps a permanent ban", () => {
    expect(activeBanOf([row({ expiresAt: null })], NOW)?.expiresAt).toBeNull();
  });

  it("ignores a ban that ended, including one ending exactly now", () => {
    expect(activeBanOf([row({ expiresAt: "2026-09-23T12:00:00.000Z" })], NOW)).toBeNull();
    expect(activeBanOf([row({ expiresAt: NOW.toISOString() })], NOW)).toBeNull();
  });

  it("ignores a lifted ban, even one whose end is still ahead", () => {
    expect(activeBanOf([row({ liftedAt: "2026-09-21T12:00:00.000Z" })], NOW)).toBeNull();
  });

  it("takes the newest of two bans in force", () => {
    const older = row({ id: "ban-old", createdAt: "2026-09-01T12:00:00.000Z", expiresAt: null });
    const newer = row({ id: "ban-new" });
    expect(activeBanOf([older, newer], NOW)?.id).toBe("ban-new");
  });
});

describe("banDurationLabel", () => {
  it("says it in the site's words", () => {
    const ban = activeBanOf([row()], NOW);
    expect(ban && banDurationLabel(ban, NOW)).toBe("Il reste 3 jours.");
    const permanent = activeBanOf([row({ expiresAt: null })], NOW);
    expect(permanent && banDurationLabel(permanent, NOW)).toBe("Ce bannissement est définitif.");
  });
});

describe("appealProblem", () => {
  it("asks for a few sentences, counting the text without its margins", () => {
    expect(appealProblem("Trop court.")).toBe(
      "Explique en quelques phrases : au moins 30 caractères.",
    );
    expect(appealProblem(`   ${"a".repeat(29)}   `)).not.toBeNull();
    expect(appealProblem("a".repeat(30))).toBeNull();
  });

  it("caps the length where the server does", () => {
    expect(appealProblem("a".repeat(4001))).toBe("4000 caractères maximum.");
    expect(appealProblem("a".repeat(4000))).toBeNull();
  });
});
