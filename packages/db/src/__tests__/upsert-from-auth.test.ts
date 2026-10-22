/**
 * The profile a sign-in refreshes, the avatar it must leave alone, and the day
 * of the streak it must not take.
 *
 * Every sign-in of an account linked to GitHub used to write GitHub's picture
 * over the avatar, so a learner's choice - picked at sign-up or uploaded in
 * the settings - lasted until the next time they signed in. And every sign-in
 * wrote lastActiveAt, which the streak reads as its last active day: the
 * lesson finished afterwards found the day taken and the streak did not grow.
 * Prisma is mocked: what this checks is what the statements ask for. The real
 * rows are in upsert-from-auth.integration.test.ts.
 */

import { applyDayBoundary, dayKey, registerActivity } from "@cyberlearn/lib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { userRepository } from "../repositories/user.repository.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: { upsert: vi.fn(), updateMany: vi.fn() },
    classInvitation: { findMany: vi.fn() },
  },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const ID = "11111111-1111-4111-8111-111111111111";
const GITHUB_PICTURE = "https://avatars.githubusercontent.com/u/1?v=4";

function signIn(avatarUrl: string | null): ReturnType<typeof userRepository.upsertFromAuth> {
  return userRepository.upsertFromAuth({
    id: ID,
    email: "alex@example.fr",
    displayName: "Alex",
    avatarUrl,
  });
}

/** The writes that ask for the avatar, apart from those that ask for the day. */
function avatarWrites(): unknown[][] {
  return mockPrisma.user.updateMany.mock.calls.filter(([args]) =>
    Object.prototype.hasOwnProperty.call((args as { data: object }).data, "avatarUrl"),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.classInvitation.findMany.mockResolvedValue([]);
  mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });
});

describe("upsertFromAuth", () => {
  it("never writes the identity's picture over a refreshed profile", async () => {
    mockPrisma.user.upsert.mockResolvedValue({
      username: "alex",
      role: "STUDENT",
      avatarUrl: "/avatars/av-3.svg",
      streakDays: 2,
    });
    await signIn(GITHUB_PICTURE);

    // The mock is untyped; its one argument is the upsert's options.
    const [args] = mockPrisma.user.upsert.mock.calls[0] as [{ update: Record<string, unknown> }];
    expect(args.update).not.toHaveProperty("avatarUrl");
    expect(avatarWrites()).toEqual([]);
  });

  it("starts a new profile with the identity's picture", async () => {
    mockPrisma.user.upsert.mockResolvedValue({
      username: null,
      role: "STUDENT",
      avatarUrl: GITHUB_PICTURE,
      streakDays: 0,
    });
    await signIn(GITHUB_PICTURE);

    // The mock is untyped; its one argument is the upsert's options.
    const [args] = mockPrisma.user.upsert.mock.calls[0] as [{ create: Record<string, unknown> }];
    expect(args.create).toMatchObject({ avatarUrl: GITHUB_PICTURE });
    expect(avatarWrites()).toEqual([]);
  });

  it("fills an avatar that is still empty, and only while it is", async () => {
    mockPrisma.user.upsert.mockResolvedValue({
      username: "alex",
      role: "STUDENT",
      avatarUrl: null,
      streakDays: 2,
    });
    await signIn(GITHUB_PICTURE);

    expect(avatarWrites()).toEqual([
      [{ where: { id: ID, avatarUrl: null }, data: { avatarUrl: GITHUB_PICTURE } }],
    ]);
  });

  it("has nothing to fill without a picture", async () => {
    mockPrisma.user.upsert.mockResolvedValue({
      username: "alex",
      role: "STUDENT",
      avatarUrl: null,
      streakDays: 2,
    });
    await signIn(null);
    expect(avatarWrites()).toEqual([]);
  });

  it("answers with the handle and the role, as before", async () => {
    mockPrisma.user.upsert.mockResolvedValue({
      username: "alex",
      role: "TEACHER",
      avatarUrl: "/avatars/av-3.svg",
      streakDays: 2,
    });
    expect(await signIn(GITHUB_PICTURE)).toEqual({ username: "alex", role: "TEACHER" });
  });

  describe("the streak's last active day", () => {
    function signedInAs(streakDays: number): void {
      mockPrisma.user.upsert.mockResolvedValue({
        username: "alex",
        role: "STUDENT",
        avatarUrl: "/avatars/av-3.svg",
        streakDays,
      });
    }

    function dayWrites(): unknown[][] {
      return mockPrisma.user.updateMany.mock.calls.filter(([args]) =>
        Object.prototype.hasOwnProperty.call((args as { data: object }).data, "lastActiveAt"),
      );
    }

    it("never writes lastActiveAt in the upsert, whatever the streak", async () => {
      for (const streakDays of [0, 1, 12]) {
        mockPrisma.user.upsert.mockClear();
        signedInAs(streakDays);
        await signIn(null);

        // The mock is untyped; its one argument is the upsert's options.
        const [args] = mockPrisma.user.upsert.mock.calls[0] as [
          { update: Record<string, unknown> },
        ];
        expect(args.update).toEqual({ email: "alex@example.fr" });
      }
    });

    it("leaves the day alone while a streak is running", async () => {
      signedInAs(1);
      await signIn(null);
      expect(dayWrites()).toEqual([]);
    });

    it("leaves the day alone for a long streak too", async () => {
      signedInAs(40);
      await signIn(null);
      expect(dayWrites()).toEqual([]);
    });

    it("moves the day for an account without a streak, as the inactivity notice needs", async () => {
      signedInAs(0);
      await signIn(null);

      expect(dayWrites()).toHaveLength(1);
      const [args] = dayWrites()[0] as [{ where: object; data: { lastActiveAt: Date } }];
      // Guarded in the statement: a streak started in between is not overwritten.
      expect(args.where).toEqual({ id: ID, streakDays: 0 });
      expect(args.data.lastActiveAt).toBeInstanceOf(Date);
    });
  });

  /**
   * The whole day, with the real streak model on a row that behaves like the
   * table's: the sign-in first, then what the learner does. A lesson reads the
   * row's day the way completeLessonForUser does (dayKey of lastActiveAt).
   */
  describe("a sign-in, then the day's work", () => {
    // 11:00 in Paris on a Thursday.
    const NOW = new Date("2026-10-22T09:00:00Z");
    const YESTERDAY = new Date("2026-10-21T14:00:00Z");
    const TWO_DAYS_AGO = new Date("2026-10-20T14:00:00Z");

    interface Row {
      streakDays: number;
      longestStreak: number;
      streakFreezes: number;
      lastActiveAt: Date;
    }

    /** A row, and a Prisma that reads and writes it the way the statements ask. */
    function table(row: Row): void {
      // The row exists, so the upsert is its update: applied, then selected.
      mockPrisma.user.upsert.mockImplementation(({ update }: { update: Partial<Row> }) => {
        const selected = {
          username: "alex",
          role: "STUDENT",
          avatarUrl: "/avatars/av-3.svg",
          streakDays: row.streakDays,
        };
        Object.assign(row, update);
        return Promise.resolve(selected);
      });
      mockPrisma.user.updateMany.mockImplementation(
        ({ where, data }: { where: { streakDays?: number }; data: Partial<Row> }) => {
          if (where.streakDays !== undefined && where.streakDays !== row.streakDays) {
            return Promise.resolve({ count: 0 });
          }
          Object.assign(row, data);
          return Promise.resolve({ count: 1 });
        },
      );
    }

    /** The streak the next lesson would start from, as completeLessonForUser reads it. */
    function stateOf(row: Row): Parameters<typeof registerActivity>[0] {
      return {
        currentStreak: row.streakDays,
        longestStreak: row.longestStreak,
        lastActiveDay: dayKey(row.lastActiveAt),
        freezes: row.streakFreezes,
      };
    }

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("lets the lesson finished after a sign-in extend the streak", async () => {
      // Yesterday's lesson started the streak; today they sign in again.
      const row: Row = {
        streakDays: 1,
        longestStreak: 1,
        streakFreezes: 1,
        lastActiveAt: YESTERDAY,
      };
      table(row);
      await signIn(null);

      const { event, state } = registerActivity(stateOf(row), NOW);
      expect(event).toBe("increment");
      expect(state.currentStreak).toBe(2);
    });

    it("does not let a sign-in alone save a streak from the nightly check", async () => {
      // Two days without a lesson and no freeze: the night breaks it, signed in or not.
      const row: Row = {
        streakDays: 3,
        longestStreak: 3,
        streakFreezes: 0,
        lastActiveAt: TWO_DAYS_AGO,
      };
      table(row);
      await signIn(null);

      expect(row.lastActiveAt).toEqual(TWO_DAYS_AGO);
      expect(applyDayBoundary(stateOf(row), NOW).event).toBe("broken");
    });

    it("starts a streak from the first lesson after a sign-in, for an account without one", async () => {
      const row: Row = {
        streakDays: 0,
        longestStreak: 5,
        streakFreezes: 1,
        lastActiveAt: TWO_DAYS_AGO,
      };
      table(row);
      await signIn(null);

      // The sign-in is the account's activity: the inactivity clock moved.
      expect(dayKey(row.lastActiveAt)).toBe(dayKey(NOW));
      const { event, state } = registerActivity(stateOf(row), NOW);
      expect(event).toBe("first");
      expect(state.currentStreak).toBe(1);
    });

    it("takes a day an earlier sign-in already recorded as it is, and counts from the next one", async () => {
      // The row the old sign-in left: a streak of 1 with today as its day, though
      // nothing was done today. The fix does not rewrite what is recorded (the
      // table cannot tell a sign-in's day from a console correction's, which
      // also moves the day to today on purpose), and does not make it worse.
      const row: Row = {
        streakDays: 1,
        longestStreak: 1,
        streakFreezes: 1,
        lastActiveAt: NOW,
      };
      table(row);
      await signIn(null);

      expect(row.lastActiveAt).toEqual(NOW);
      expect(registerActivity(stateOf(row), NOW).event).toBe("same-day");
      const tomorrow = new Date("2026-10-23T09:00:00Z");
      const next = registerActivity(stateOf(row), tomorrow);
      expect(next.event).toBe("increment");
      expect(next.state.currentStreak).toBe(2);
    });

    it("leaves a streak started in between to the lesson", async () => {
      // The sign-in read 0 and a lesson started the streak before the sign-in's write.
      const row: Row = {
        streakDays: 0,
        longestStreak: 0,
        streakFreezes: 1,
        lastActiveAt: TWO_DAYS_AGO,
      };
      table(row);
      mockPrisma.user.upsert.mockImplementationOnce(() => {
        const read = Promise.resolve({
          username: "alex",
          role: "STUDENT",
          avatarUrl: "/avatars/av-3.svg",
          streakDays: row.streakDays,
        });
        row.streakDays = 1;
        row.lastActiveAt = YESTERDAY;
        return read;
      });
      await signIn(null);

      expect(row.lastActiveAt).toEqual(YESTERDAY);
    });
  });
});
