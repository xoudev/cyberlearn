import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireAdminAction: vi.fn<() => Promise<{ id: string }>>(),
  adjustXp: vi.fn(),
  correctStreak: vi.fn(),
  grant: vi.fn(),
  revoke: vi.fn(),
  logError: vi.fn(),
  revalidatePath: vi.fn<(path: string) => void>(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  adjustXp: m.adjustXp,
  streakRepository: { correct: m.correctStreak },
  badgeRepository: { grant: m.grant, revoke: m.revoke },
}));
vi.mock("@cyberlearn/lib/logger", () => ({
  logger: { error: m.logError },
  errorMessage: (error: unknown) => String(error),
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));

const { adjustXpAction, correctStreakAction, grantBadgeAction, revokeBadgeAction } = await import(
  "../gamification-actions"
);

/**
 * The console's corrections to an account's XP, streak and badges: who may
 * make them, what they accept, what they hand the repository, and what they
 * say they did.
 */

const ADMIN = "11111111-1111-4111-8111-111111111111";
const TARGET = "22222222-2222-4222-8222-222222222222";
const BADGE = "33333333-3333-4333-8333-333333333333";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: ADMIN });
});

describe("adjustXpAction", () => {
  const valid = { userId: TARGET, direction: "add", amount: "300", reason: "Quiz corrigé" };

  beforeEach(() => {
    m.adjustXp.mockResolvedValue({
      ok: true,
      requested: 300,
      applied: 300,
      before: { xpTotal: 320, level: 3 },
      after: { xpTotal: 620, level: 4 },
    });
  });

  it("checks the caller is an admin before anything else", async () => {
    m.requireAdminAction.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(adjustXpAction({}, form(valid))).rejects.toThrow("NEXT_REDIRECT");
    expect(m.adjustXp).not.toHaveBeenCalled();
  });

  it("adds XP as the administrator, with the reason, and says what moved", async () => {
    const result = await adjustXpAction({}, form(valid));

    expect(m.adjustXp).toHaveBeenCalledWith({
      userId: TARGET,
      delta: 300,
      reason: "Quiz corrigé",
      actorId: ADMIN,
    });
    expect(result.ok).toBe(true);
    expect(result.notice).toMatch(/^\+300 XP : 320 → 620 XP, niveau 3 → 4\./u);
    expect(m.revalidatePath).toHaveBeenCalledWith(`/users/${TARGET}`);
  });

  it("takes XP back as a negative amount", async () => {
    await adjustXpAction({}, form({ ...valid, direction: "remove", amount: "40" }));
    expect(m.adjustXp).toHaveBeenCalledWith(expect.objectContaining({ delta: -40 }));
  });

  it.each([
    [{ amount: "0" }, "Au moins 1 XP."],
    [{ amount: "2.5" }, "Un nombre entier d'XP."],
    [{ amount: "100001" }, /^Au plus 100.000 XP par correction\.$/u],
    [{ direction: "double" }, "Choisis d'ajouter ou de retirer de l'XP."],
    [{ reason: "  x " }, "Donne un motif : au moins 3 caractères."],
    [{ reason: "x".repeat(501) }, "Le motif tient en 500 caractères au plus."],
    [{ userId: "not-a-uuid" }, "Compte invalide."],
  ])("refuses %o without touching the account", async (override, message) => {
    const result = await adjustXpAction({}, form({ ...valid, ...override }));
    if (typeof message === "string") expect(result.error).toBe(message);
    else expect(result.error).toMatch(message);
    expect(m.adjustXp).not.toHaveBeenCalled();
  });

  it("passes on the repository's refusal, and revalidates nothing", async () => {
    m.adjustXp.mockResolvedValue({ ok: false, reason: "NOTHING_TO_TAKE_BACK" });
    const result = await adjustXpAction({}, form({ ...valid, direction: "remove" }));
    expect(result).toEqual({
      error: "Ce compte n'a pas d'XP à retirer : son total est déjà à zéro.",
    });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("logs a failure and says nothing was changed", async () => {
    m.adjustXp.mockRejectedValue(new Error("connection reset"));
    const result = await adjustXpAction({}, form(valid));
    expect(result).toEqual({ error: "La correction a échoué. Rien n'a été modifié." });
    expect(m.logError).toHaveBeenCalledOnce();
  });
});

describe("correctStreakAction", () => {
  const valid = { userId: TARGET, streakDays: "12", streakFreezes: "1", reason: "Panne du 11" };

  it("sets the streak and the freezes as the administrator", async () => {
    m.correctStreak.mockResolvedValue({
      ok: true,
      before: { streakDays: 0, longestStreak: 10, streakFreezes: 1 },
      after: { streakDays: 12, longestStreak: 12, streakFreezes: 1 },
      movedToToday: true,
    });
    const result = await correctStreakAction({}, form(valid));

    expect(m.correctStreak).toHaveBeenCalledWith(
      TARGET,
      { streakDays: 12, streakFreezes: 1 },
      { actorId: ADMIN, reason: "Panne du 11" },
    );
    expect(result.ok).toBe(true);
    expect(result.notice).toMatch(/^Série corrigée : 0 → 12 jours, record 10 → 12\./u);
  });

  it.each([
    [{ streakDays: "-1" }, "Une série ne descend pas sous 0."],
    [{ streakDays: "3651" }, "Au plus 3650 jours."],
    [{ streakFreezes: "3" }, "Au plus 2 gels en réserve."],
    [{ streakDays: "abc" }, "Indique un nombre de jours."],
  ])("refuses %o", async (override, message) => {
    const result = await correctStreakAction({}, form({ ...valid, ...override }));
    expect(result.error).toBe(message);
    expect(m.correctStreak).not.toHaveBeenCalled();
  });
});

describe("grantBadgeAction and revokeBadgeAction", () => {
  const valid = { userId: TARGET, badgeId: BADGE, reason: "Badge jamais attribué" };

  it("grants a badge as the administrator, with the reason", async () => {
    m.grant.mockResolvedValue({ ok: true, badgeName: "Premier pas", xpCredited: 50 });
    const result = await grantBadgeAction({}, form(valid));

    expect(m.grant).toHaveBeenCalledWith(TARGET, BADGE, {
      actorId: ADMIN,
      reason: "Badge jamais attribué",
    });
    expect(result.notice).toBe(
      "Badge « Premier pas » attribué, +50 XP. La personne a reçu la notification d'un badge obtenu.",
    );
  });

  it("refuses a grant with no badge picked", async () => {
    const result = await grantBadgeAction({}, form({ ...valid, badgeId: "" }));
    expect(result.error).toBe("Choisis un badge.");
    expect(m.grant).not.toHaveBeenCalled();
  });

  it("takes the XP back only when the box is ticked", async () => {
    m.revoke.mockResolvedValue({ ok: true, badgeName: "Premier pas", xpTakenBack: 50 });

    await revokeBadgeAction({}, form({ ...valid, takeBackXp: "on" }));
    expect(m.revoke).toHaveBeenLastCalledWith(TARGET, BADGE, {
      actorId: ADMIN,
      reason: "Badge jamais attribué",
      takeBackXp: true,
    });

    m.revoke.mockResolvedValue({ ok: true, badgeName: "Premier pas", xpTakenBack: 0 });
    const kept = await revokeBadgeAction({}, form(valid));
    expect(m.revoke).toHaveBeenLastCalledWith(
      TARGET,
      BADGE,
      expect.objectContaining({ takeBackXp: false }),
    );
    expect(kept.notice).toContain("restent acquis");
  });

  it("passes on a revocation of a badge the account does not hold", async () => {
    m.revoke.mockResolvedValue({ ok: false, reason: "NOT_EARNED" });
    const result = await revokeBadgeAction({}, form(valid));
    expect(result).toEqual({ error: "Ce compte n'a pas, ou plus, ce badge." });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });
});
