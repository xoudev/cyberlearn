/**
 * The console's corrections to an account's XP, streak and badges: adjustXp,
 * streakRepository.correct, badgeRepository.grant and .revoke.
 *
 * Prisma is replaced by an in-memory account, so the tests follow what a
 * sequence of corrections leaves behind: the total, the ledger the week's and
 * the month's boards add up, the notifications, and the audit trail.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeLevel } from "@cyberlearn/lib";

interface FakeUser {
  id: string;
  xpTotal: number;
  level: number;
  streakDays: number;
  longestStreak: number;
  streakFreezes: number;
  lastActiveAt: Date;
}

interface FakeBadge {
  id: string;
  name: string;
  description: string;
  rarity: string;
  xpReward: number;
  isActive: boolean;
}

const { db } = vi.hoisted(() => ({
  db: {
    user: null as FakeUser | null,
    badges: [] as FakeBadge[],
    held: new Map<string, { context: Record<string, unknown> }>(),
    ledger: [] as { amount: number; source: string }[],
    notifications: [] as { type: string }[],
    audit: [] as { action: string; targetId: string; metadata: Record<string, unknown> }[],
  },
}));

type Where = { id?: string; xpTotal?: { gte: number } };
type Data = Record<string, unknown>;

/** Applies a Prisma-style update to the fake user. */
function apply(user: FakeUser, data: Data): void {
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "object" && value !== null && "increment" in value) {
      const step = (value as { increment: number }).increment;
      (user as unknown as Record<string, number>)[key] =
        (user as unknown as Record<string, number>)[key]! + step;
    } else {
      (user as unknown as Record<string, unknown>)[key] = value;
    }
  }
}

const tx = {
  user: {
    findUnique: vi.fn(({ where }: { where: Where }) =>
      Promise.resolve(db.user?.id === where.id ? { ...db.user } : null),
    ),
    findUniqueOrThrow: vi.fn(({ where }: { where: Where }) => {
      if (db.user?.id !== where.id) return Promise.reject(new Error("no user"));
      return Promise.resolve({ ...db.user });
    }),
    update: vi.fn(({ data }: { data: Data }) => {
      if (db.user) apply(db.user, data);
      return Promise.resolve({});
    }),
    updateMany: vi.fn(({ where, data }: { where: Where; data: Data }) => {
      const user = db.user;
      if (!user || user.id !== where.id) return Promise.resolve({ count: 0 });
      if (where.xpTotal && user.xpTotal < where.xpTotal.gte) return Promise.resolve({ count: 0 });
      apply(user, data);
      return Promise.resolve({ count: 1 });
    }),
  },
  season: { findFirst: vi.fn(() => Promise.resolve(null)) },
  xpLedger: {
    create: vi.fn(({ data }: { data: { amount: number; source: string } }) => {
      db.ledger.push({ amount: data.amount, source: data.source });
      return Promise.resolve({});
    }),
  },
  notification: {
    create: vi.fn(({ data }: { data: { type: string } }) => {
      db.notifications.push({ type: data.type });
      return Promise.resolve({});
    }),
    createMany: vi.fn(({ data }: { data: { type: string }[] }) => {
      db.notifications.push(...data.map((row) => ({ type: row.type })));
      return Promise.resolve({ count: data.length });
    }),
  },
  auditLog: {
    create: vi.fn(
      ({
        data,
      }: {
        data: { action: string; targetId: string; metadata: Record<string, unknown> };
      }) => {
        db.audit.push({ action: data.action, targetId: data.targetId, metadata: data.metadata });
        return Promise.resolve({});
      },
    ),
  },
  badge: {
    findUnique: vi.fn(({ where }: { where: { id: string } }) =>
      Promise.resolve(db.badges.find((badge) => badge.id === where.id) ?? null),
    ),
  },
  userBadge: {
    createManyAndReturn: vi.fn(
      ({ data }: { data: { badgeId: string; context: Record<string, unknown> }[] }) => {
        const inserted = data.filter((row) => !db.held.has(row.badgeId));
        for (const row of inserted) db.held.set(row.badgeId, { context: row.context });
        return Promise.resolve(inserted.map((row) => ({ badgeId: row.badgeId })));
      },
    ),
    findUnique: vi.fn(
      ({ where }: { where: { userId_badgeId: { userId: string; badgeId: string } } }) => {
        const { badgeId } = where.userId_badgeId;
        const row = db.held.get(badgeId);
        const badge = db.badges.find((entry) => entry.id === badgeId);
        return Promise.resolve(
          row && badge ? { context: row.context, badge: { name: badge.name } } : null,
        );
      },
    ),
    deleteMany: vi.fn(({ where }: { where: { badgeId: string } }) =>
      Promise.resolve({ count: db.held.delete(where.badgeId) ? 1 : 0 }),
    ),
  },
};

vi.mock("../prisma.js", () => ({
  prisma: { $transaction: (run: (client: typeof tx) => Promise<unknown>) => run(tx) },
}));

const { adjustXp, XP_ADJUSTMENT_ACTION } = await import("../xp/adjust.js");
const { badgeRepository, BADGE_GRANT_ACTION, BADGE_REVOKE_ACTION } = await import(
  "../repositories/badge.repository.js"
);
const { streakRepository, STREAK_CORRECTION_ACTION } = await import(
  "../repositories/streak.repository.js"
);

const USER = "11111111-1111-4111-8111-111111111111";
const ADMIN = "99999999-9999-4999-8999-999999999999";
const BADGE = "22222222-2222-4222-8222-222222222222";

/** What the week's board would add up for the account: its ledger since Monday. */
function weekSum(): number {
  return db.ledger.reduce((sum, row) => sum + row.amount, 0);
}

beforeEach(() => {
  vi.clearAllMocks();
  db.user = {
    id: USER,
    xpTotal: 320,
    level: computeLevel(320).level,
    streakDays: 4,
    longestStreak: 10,
    streakFreezes: 1,
    lastActiveAt: new Date("2026-10-16T18:00:00Z"),
  };
  db.badges = [
    {
      id: BADGE,
      name: "Premier pas",
      description: "Une première leçon terminée",
      rarity: "COMMON",
      xpReward: 50,
      isActive: true,
    },
  ];
  db.held.clear();
  db.ledger = [];
  db.notifications = [];
  db.audit = [];
});

describe("adjustXp", () => {
  it("adds XP as an ADJUSTMENT line, audited with its reason, notifying nobody", async () => {
    const result = await adjustXp({
      userId: USER,
      delta: 300,
      reason: "Bug du quiz",
      actorId: ADMIN,
    });

    expect(result).toEqual({
      ok: true,
      requested: 300,
      applied: 300,
      before: { xpTotal: 320, level: 3 },
      after: { xpTotal: 620, level: 4 },
    });
    expect(db.user).toMatchObject({ xpTotal: 620, level: 4 });
    expect(db.ledger).toEqual([{ amount: 300, source: "ADJUSTMENT" }]);
    // A level crossed, and still no LEVEL_UP: a correction is not an achievement.
    expect(db.notifications).toEqual([]);
    expect(db.audit).toEqual([
      {
        action: XP_ADJUSTMENT_ACTION,
        targetId: USER,
        metadata: {
          delta: 300,
          applied: 300,
          reason: "Bug du quiz",
          before: { xpTotal: 320, level: 3 },
          after: { xpTotal: 620, level: 4 },
        },
      },
    ]);
  });

  it("takes XP back down to zero at most, and says how much actually came off", async () => {
    const result = await adjustXp({ userId: USER, delta: -500, reason: "Triche", actorId: ADMIN });

    expect(result).toMatchObject({ ok: true, requested: -500, applied: -320 });
    expect(db.user).toMatchObject({ xpTotal: 0, level: 1 });
    expect(db.ledger).toEqual([{ amount: -320, source: "ADJUSTMENT" }]);
    expect(db.notifications).toEqual([]);
  });

  it("keeps the period boards in step: the ledger moves exactly as the total does", async () => {
    const before = db.user?.xpTotal ?? 0;
    await adjustXp({ userId: USER, delta: 120, reason: "Rattrapage", actorId: ADMIN });
    await adjustXp({ userId: USER, delta: -400, reason: "Erreur", actorId: ADMIN });

    // 320 + 120 = 440, then 400 taken back: 40 left.
    expect(db.user?.xpTotal).toBe(40);
    expect(weekSum()).toBe((db.user?.xpTotal ?? 0) - before);
  });

  it("refuses to take back from an account that has nothing", async () => {
    if (db.user) db.user.xpTotal = 0;
    const result = await adjustXp({ userId: USER, delta: -10, reason: "Erreur", actorId: ADMIN });

    expect(result).toEqual({ ok: false, reason: "NOTHING_TO_TAKE_BACK" });
    expect(db.ledger).toEqual([]);
    expect(db.audit).toEqual([]);
  });

  it("refuses an account that no longer exists", async () => {
    db.user = null;
    expect(await adjustXp({ userId: USER, delta: 5, reason: "Test", actorId: ADMIN })).toEqual({
      ok: false,
      reason: "NO_USER",
    });
  });
});

describe("badgeRepository.grant and .revoke", () => {
  it("grants a badge with its XP and the learner's notification", async () => {
    const result = await badgeRepository.grant(USER, BADGE, { actorId: ADMIN, reason: "Oubli" });

    expect(result).toEqual({ ok: true, badgeName: "Premier pas", xpCredited: 50 });
    expect(db.user?.xpTotal).toBe(370);
    expect(db.ledger).toEqual([{ amount: 50, source: "BADGE" }]);
    expect(db.held.get(BADGE)?.context).toEqual({ source: "console", xpCredited: 50 });
    expect(db.notifications).toEqual([{ type: "BADGE_EARNED" }]);
    expect(db.audit.map((row) => row.action)).toEqual([BADGE_GRANT_ACTION]);
    expect(db.audit[0]?.metadata).toMatchObject({
      badgeId: BADGE,
      xpCredited: 50,
      reason: "Oubli",
    });
  });

  it("never pays a badge twice", async () => {
    await badgeRepository.grant(USER, BADGE, { actorId: ADMIN, reason: "Oubli" });
    const again = await badgeRepository.grant(USER, BADGE, { actorId: ADMIN, reason: "Oubli" });

    expect(again).toEqual({ ok: false, reason: "ALREADY_EARNED" });
    expect(db.user?.xpTotal).toBe(370);
    expect(db.audit).toHaveLength(1);
  });

  it("refuses an inactive badge, and one that does not exist", async () => {
    expect(
      await badgeRepository.grant(USER, "33333333-3333-4333-8333-333333333333", {
        actorId: ADMIN,
        reason: "Oubli",
      }),
    ).toEqual({ ok: false, reason: "NO_BADGE" });

    const [first] = db.badges;
    if (first) first.isActive = false;
    expect(await badgeRepository.grant(USER, BADGE, { actorId: ADMIN, reason: "Oubli" })).toEqual({
      ok: false,
      reason: "INACTIVE",
    });
    expect(db.held.size).toBe(0);
  });

  it("revokes a badge, taking back what it paid when asked", async () => {
    await badgeRepository.grant(USER, BADGE, { actorId: ADMIN, reason: "Oubli" });

    const result = await badgeRepository.revoke(USER, BADGE, {
      actorId: ADMIN,
      reason: "Attribué par erreur",
      takeBackXp: true,
    });

    expect(result).toEqual({ ok: true, badgeName: "Premier pas", xpTakenBack: 50 });
    expect(db.held.has(BADGE)).toBe(false);
    expect(db.user?.xpTotal).toBe(320);
    expect(db.ledger).toEqual([
      { amount: 50, source: "BADGE" },
      { amount: -50, source: "ADJUSTMENT" },
    ]);
    expect(db.audit.map((row) => row.action)).toEqual([BADGE_GRANT_ACTION, BADGE_REVOKE_ACTION]);
  });

  it("revokes without touching the XP by default", async () => {
    await badgeRepository.grant(USER, BADGE, { actorId: ADMIN, reason: "Oubli" });
    const result = await badgeRepository.revoke(USER, BADGE, {
      actorId: ADMIN,
      reason: "Retiré",
      takeBackXp: false,
    });

    expect(result).toEqual({ ok: true, badgeName: "Premier pas", xpTakenBack: 0 });
    expect(db.user?.xpTotal).toBe(370);
  });

  it("takes nothing back for a legacy row that was never paid", async () => {
    db.held.set(BADGE, { context: { lessonId: "l1" } });
    const result = await badgeRepository.revoke(USER, BADGE, {
      actorId: ADMIN,
      reason: "Retiré",
      takeBackXp: true,
    });

    expect(result).toEqual({ ok: true, badgeName: "Premier pas", xpTakenBack: 0 });
    expect(db.ledger).toEqual([]);
  });

  it("re-grants a revoked badge: paid again, notified again, every step audited", async () => {
    await badgeRepository.grant(USER, BADGE, { actorId: ADMIN, reason: "Oubli" });
    await badgeRepository.revoke(USER, BADGE, {
      actorId: ADMIN,
      reason: "Erreur de compte",
      takeBackXp: true,
    });
    const again = await badgeRepository.grant(USER, BADGE, {
      actorId: ADMIN,
      reason: "Bon compte",
    });

    expect(again).toEqual({ ok: true, badgeName: "Premier pas", xpCredited: 50 });
    expect(db.held.has(BADGE)).toBe(true);
    expect(db.user?.xpTotal).toBe(370);
    expect(weekSum()).toBe(50);
    expect(db.notifications).toEqual([{ type: "BADGE_EARNED" }, { type: "BADGE_EARNED" }]);
    expect(db.audit.map((row) => row.action)).toEqual([
      BADGE_GRANT_ACTION,
      BADGE_REVOKE_ACTION,
      BADGE_GRANT_ACTION,
    ]);
  });

  it("refuses to revoke a badge the account does not hold", async () => {
    expect(
      await badgeRepository.revoke(USER, BADGE, { actorId: ADMIN, reason: "x", takeBackXp: true }),
    ).toEqual({ ok: false, reason: "NOT_EARNED" });
    expect(db.audit).toEqual([]);
  });
});

describe("streakRepository.correct", () => {
  // Saturday 17 October 2026, 10:00 in Paris.
  const NOW = new Date("2026-10-17T08:00:00Z");

  it("sets a live streak, raising the record, and keeps the last active day", async () => {
    const result = await streakRepository.correct(
      USER,
      { streakDays: 30 },
      { actorId: ADMIN, reason: "Série perdue par une panne", now: NOW },
    );

    expect(result).toEqual({
      ok: true,
      before: { streakDays: 4, longestStreak: 10, streakFreezes: 1 },
      after: { streakDays: 30, longestStreak: 30, streakFreezes: 1 },
      movedToToday: false,
    });
    // Active yesterday: the day stays, so today's activity still counts.
    expect(db.user?.lastActiveAt).toEqual(new Date("2026-10-16T18:00:00Z"));
    expect(db.audit).toEqual([
      {
        action: STREAK_CORRECTION_ACTION,
        targetId: USER,
        metadata: {
          reason: "Série perdue par une panne",
          before: { streakDays: 4, longestStreak: 10, streakFreezes: 1 },
          after: { streakDays: 30, longestStreak: 30, streakFreezes: 1 },
          movedToToday: false,
        },
      },
    ]);
  });

  it("brings a broken streak back to life until tomorrow", async () => {
    if (db.user) {
      db.user.streakDays = 0;
      db.user.lastActiveAt = new Date("2026-10-10T18:00:00Z");
    }
    const result = await streakRepository.correct(
      USER,
      { streakDays: 12, streakFreezes: 2 },
      { actorId: ADMIN, reason: "Panne du 11", now: NOW },
    );

    expect(result).toMatchObject({ ok: true, movedToToday: true });
    expect(db.user).toMatchObject({
      streakDays: 12,
      longestStreak: 12,
      streakFreezes: 2,
      lastActiveAt: NOW,
    });
  });

  it("says when there is nothing to change", async () => {
    const result = await streakRepository.correct(
      USER,
      { streakDays: 4 },
      { actorId: ADMIN, reason: "Vérification", now: NOW },
    );

    expect(result).toEqual({ ok: false, reason: "UNCHANGED" });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(db.audit).toEqual([]);
  });

  it("refuses an account that no longer exists", async () => {
    db.user = null;
    expect(
      await streakRepository.correct(USER, { streakDays: 3 }, { actorId: ADMIN, reason: "x" }),
    ).toEqual({ ok: false, reason: "NO_USER" });
  });
});
