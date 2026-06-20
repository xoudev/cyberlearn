import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeLevel, computeSm2 } from "@cyberlearn/lib";

const m = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireRequestUser: vi.fn(),
  scheduleFindUnique: vi.fn(),
  scheduleUpdate: vi.fn(),
  lessonFindUnique: vi.fn(),
  userFindUniqueOrThrow: vi.fn(),
  userUpdate: vi.fn(),
  notificationCreate: vi.fn(),
  seasonFindFirst: vi.fn(),
  xpLedgerCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("@/lib/auth", () => ({ requireRequestUser: m.requireRequestUser }));
vi.mock("@cyberlearn/db", () => ({
  prisma: {
    reviewSchedule: { findUnique: m.scheduleFindUnique, update: m.scheduleUpdate },
    lesson: { findUnique: m.lessonFindUnique },
    $transaction: m.transaction,
  },
}));

import { submitReviewAction } from "../review-actions";

const SCHEDULE_ID = "11111111-1111-4111-8111-111111111111";
const SCHEDULE = {
  id: SCHEDULE_ID,
  userId: "u1",
  lessonId: "l1",
  easeFactor: 2.5,
  intervalDays: 1,
  repetitions: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  m.requireRequestUser.mockResolvedValue({ id: "u1" });
  m.scheduleFindUnique.mockResolvedValue(SCHEDULE);
  m.scheduleUpdate.mockResolvedValue({});
  m.lessonFindUnique.mockResolvedValue({ xpReward: 50 });
  m.seasonFindFirst.mockResolvedValue(null);
  m.xpLedgerCreate.mockResolvedValue({});
  // creditXp runs inside the tx: it reads the user, then writes xpTotal + level.
  m.transaction.mockImplementation((cb: (tx: unknown) => Promise<unknown>) =>
    cb({
      user: { findUniqueOrThrow: m.userFindUniqueOrThrow, update: m.userUpdate },
      notification: { create: m.notificationCreate },
      season: { findFirst: m.seasonFindFirst },
      xpLedger: { create: m.xpLedgerCreate },
    }),
  );
  m.userFindUniqueOrThrow.mockResolvedValue({ xpTotal: 100, level: computeLevel(100).level });
  m.userUpdate.mockResolvedValue({});
  m.notificationCreate.mockResolvedValue({});
});

describe("submitReviewAction", () => {
  it("rejects a schedule owned by someone else", async () => {
    m.scheduleFindUnique.mockResolvedValue({ ...SCHEDULE, userId: "intruder" });

    const res = await submitReviewAction(SCHEDULE_ID, 5);

    expect(res.success).toBe(false);
    expect(m.scheduleUpdate).not.toHaveBeenCalled();
  });

  it("rejects a non-uuid schedule id before touching the db", async () => {
    const res = await submitReviewAction("not-a-uuid", 5);

    expect(res.success).toBe(false);
    expect(m.scheduleFindUnique).not.toHaveBeenCalled();
  });

  it("applies the SM-2 result and credits 10% lesson XP with a level recompute", async () => {
    const expected = computeSm2(5, { easeFactor: 2.5, intervalDays: 1, repetitions: 0 });

    const res = await submitReviewAction(SCHEDULE_ID, 5);

    expect(res.success).toBe(true);
    expect(res.reviewXp).toBe(5);
    // SAFETY: shape of the recorded prisma.reviewSchedule.update call argument.
    const arg = m.scheduleUpdate.mock.calls[0]?.[0] as {
      where: { id: string };
      data: {
        easeFactor: number;
        intervalDays: number;
        repetitions: number;
        nextReviewAt: Date;
        lastReviewedAt: Date;
      };
    };
    expect(arg.where).toEqual({ id: SCHEDULE_ID });
    expect(arg.data.easeFactor).toBe(expected.easeFactor);
    expect(arg.data.intervalDays).toBe(expected.intervalDays);
    expect(arg.data.repetitions).toBe(expected.repetitions);
    expect(arg.data.nextReviewAt).toBeInstanceOf(Date);
    expect(arg.data.lastReviewedAt).toBeInstanceOf(Date);
    // creditXp credits the XP and recomputes the level in a single update.
    expect(m.userUpdate).toHaveBeenCalledTimes(1);
    expect(m.userUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { xpTotal: 105, level: computeLevel(105).level },
    });
    expect(m.revalidatePath).toHaveBeenCalledWith("/revisions");
    expect(m.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("reschedules without any XP when the lesson was forgotten (quality 1)", async () => {
    const res = await submitReviewAction(SCHEDULE_ID, 1);

    expect(res.success).toBe(true);
    expect(res.reviewXp).toBe(0);
    expect(m.scheduleUpdate).toHaveBeenCalled();
    expect(m.lessonFindUnique).not.toHaveBeenCalled();
    expect(m.transaction).not.toHaveBeenCalled();
  });

  it("skips the credit transaction for a zero-XP lesson", async () => {
    m.lessonFindUnique.mockResolvedValue({ xpReward: 0 });

    const res = await submitReviewAction(SCHEDULE_ID, 3);

    expect(res.success).toBe(true);
    expect(res.reviewXp).toBe(0);
    expect(m.transaction).not.toHaveBeenCalled();
  });
});
