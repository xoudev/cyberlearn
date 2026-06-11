import { describe, expect, it } from "vitest";
import { computeLevel } from "@cyberlearn/lib";
import { backfillBadgeXp } from "../backfill-badge-xp.js";
import type { PrismaClient } from "@prisma/client";

// ── In-memory fake of the Prisma surface the backfill touches ────────────────

interface FakeRow {
  id: string;
  userId: string;
  context: Record<string, unknown> | null;
  badge: { xpReward: number };
}

interface FakeUser {
  xpTotal: number;
  level: number;
}

function makeFakeDb(rows: FakeRow[], users: Record<string, FakeUser>) {
  let userUpdateCalls = 0;
  const db = {
    userBadge: {
      findMany: () => Promise.resolve(rows.map((r) => ({ ...r }))),
      update: ({
        where,
        data,
      }: {
        where: { id: string };
        data: { context: Record<string, unknown> };
      }) => {
        const row = rows.find((r) => r.id === where.id);
        if (row) row.context = data.context;
        return Promise.resolve(row);
      },
    },
    user: {
      findUnique: ({ where }: { where: { id: string } }) =>
        Promise.resolve(users[where.id] ? { ...users[where.id] } : null),
      findUniqueOrThrow: ({ where }: { where: { id: string } }) => {
        const user = users[where.id];
        if (!user) throw new Error("not found");
        return Promise.resolve({ ...user });
      },
      update: ({
        where,
        data,
      }: {
        where: { id: string };
        data: { xpTotal: number; level: number };
      }) => {
        userUpdateCalls += 1;
        const user = users[where.id];
        if (user) {
          user.xpTotal = data.xpTotal;
          user.level = data.level;
        }
        return Promise.resolve(user);
      },
    },
    $transaction: (cb: (tx: unknown) => Promise<unknown>) => cb(db),
    getUserUpdateCalls: () => userUpdateCalls,
  };
  return db;
}

// SAFETY: the fake implements exactly the Prisma subset backfillBadgeXp uses.
function asClient(db: ReturnType<typeof makeFakeDb>): PrismaClient {
  return db as unknown as PrismaClient;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("backfillBadgeXp", () => {
  it("dry-run reports deltas without writing anything", async () => {
    const rows: FakeRow[] = [
      { id: "r1", userId: "u1", context: { lessonId: "l1" }, badge: { xpReward: 50 } },
      { id: "r2", userId: "u1", context: null, badge: { xpReward: 30 } },
    ];
    const users = { u1: { xpTotal: 100, level: computeLevel(100).level } };
    const db = makeFakeDb(rows, users);

    const report = await backfillBadgeXp(false, asClient(db));

    expect(report.applied).toBe(false);
    expect(report.totalUnstampedRows).toBe(2);
    expect(report.users).toEqual([
      {
        userId: "u1",
        unstampedBadges: 2,
        xpDelta: 80,
        xpBefore: 100,
        xpAfter: 180,
        levelBefore: computeLevel(100).level,
        levelAfter: computeLevel(180).level,
      },
    ]);
    // Nothing written.
    expect(users.u1.xpTotal).toBe(100);
    expect(rows[0]?.context).toEqual({ lessonId: "l1" });
  });

  it("apply credits the delta, recomputes the level and stamps every row", async () => {
    const rows: FakeRow[] = [
      { id: "r1", userId: "u1", context: { lessonId: "l1" }, badge: { xpReward: 50 } },
      // Already credited at insertion time by the runtime helper - untouched.
      { id: "r2", userId: "u1", context: { xpCredited: 40 }, badge: { xpReward: 40 } },
      // Zero-XP badge: stamped so re-runs skip it, but no credit.
      { id: "r3", userId: "u2", context: null, badge: { xpReward: 0 } },
    ];
    const users = {
      u1: { xpTotal: 100, level: computeLevel(100).level },
      u2: { xpTotal: 10, level: computeLevel(10).level },
    };
    const db = makeFakeDb(rows, users);

    const report = await backfillBadgeXp(true, asClient(db));

    expect(report.applied).toBe(true);
    expect(report.totalUnstampedRows).toBe(2); // r1 + r3 (r2 already stamped)
    expect(users.u1.xpTotal).toBe(150);
    expect(users.u1.level).toBe(computeLevel(150).level);
    expect(users.u2.xpTotal).toBe(10); // zero delta - no credit
    expect(rows[0]?.context).toEqual({ lessonId: "l1", xpCredited: 50 });
    expect(rows[2]?.context).toEqual({ xpCredited: 0 });
  });

  it("is idempotent: a second run is a strict no-op", async () => {
    const rows: FakeRow[] = [
      { id: "r1", userId: "u1", context: { source: "retroactive" }, badge: { xpReward: 60 } },
    ];
    const users = { u1: { xpTotal: 0, level: computeLevel(0).level } };
    const db = makeFakeDb(rows, users);

    const first = await backfillBadgeXp(true, asClient(db));
    expect(first.totalUnstampedRows).toBe(1);
    expect(users.u1.xpTotal).toBe(60);
    const updatesAfterFirst = db.getUserUpdateCalls();

    const second = await backfillBadgeXp(true, asClient(db));
    expect(second.totalUnstampedRows).toBe(0);
    expect(second.users).toHaveLength(0);
    expect(users.u1.xpTotal).toBe(60); // unchanged - no double credit
    expect(db.getUserUpdateCalls()).toBe(updatesAfterFirst); // no extra writes
  });
});
