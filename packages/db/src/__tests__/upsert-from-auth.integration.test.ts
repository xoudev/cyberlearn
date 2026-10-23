/**
 * What a sign-in does to the streak's last active day, against real rows.
 *
 * The unit spec next to this one checks the statements upsertFromAuth sends,
 * with Prisma mocked. What a mock cannot show is the guard in the write
 * (`where streakDays = 0`): that a streak a lesson starts between the sign-in's
 * read and its write is not overwritten, and that the day a running streak
 * stands on is the one still in the row afterwards.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { dayKey, registerActivity } from "@cyberlearn/lib";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "../prisma.js";
import { userRepository } from "../repositories/user.repository.js";

const suffix = randomUUID().slice(0, 8);
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const STARTED = new Date();

// Whole milliseconds, as the column keeps them.
const YESTERDAY = new Date(STARTED.getTime() - DAY);
const THREE_DAYS_AGO = new Date(STARTED.getTime() - 3 * DAY);

// The streak's own days, fixed so that "the next day" does not depend on the
// hour the suite runs at (a Paris day is 23 or 25 hours twice a year).
const LESSON_DAY = new Date("2026-10-21T14:00:00Z");
const NEXT_DAY = new Date("2026-10-22T09:00:00Z");

const ACCOUNTS = {
  // Yesterday's lesson started the streak: it is running, and yesterday is its day.
  running: { streakDays: 1, lastActiveAt: LESSON_DAY },
  // The streak broke (or never began): the sign-in is the account's activity.
  broken: { streakDays: 0, lastActiveAt: THREE_DAYS_AGO },
  // Same as broken, but a lesson starts a streak while the sign-in is under way.
  racing: { streakDays: 0, lastActiveAt: THREE_DAYS_AGO },
} as const;

type Name = keyof typeof ACCOUNTS;
const NAMES = Object.keys(ACCOUNTS) as Name[];
const ids = Object.fromEntries(NAMES.map((name) => [name, randomUUID()])) as Record<Name, string>;
const newcomerId = randomUUID();

let configured = false;

function emailOf(name: string): string {
  return `ufa-${name}-${suffix}@t.internal`;
}

function signIn(name: Name) {
  return userRepository.upsertFromAuth({
    id: ids[name],
    email: emailOf(name),
    displayName: name,
    avatarUrl: null,
  });
}

function readRow(id: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id },
    select: { streakDays: true, longestStreak: true, streakFreezes: true, lastActiveAt: true },
  });
}

describe("upsertFromAuth and the streak's day (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;
    for (const name of NAMES) {
      await prisma.user.create({
        data: {
          id: ids[name],
          email: emailOf(name),
          username: `ufa${name}${suffix}`,
          displayName: name,
          streakDays: ACCOUNTS[name].streakDays,
          longestStreak: ACCOUNTS[name].streakDays,
          lastActiveAt: ACCOUNTS[name].lastActiveAt,
        },
      });
    }
    configured = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.user.deleteMany({ where: { id: { in: [...Object.values(ids), newcomerId] } } });
  });

  it("leaves the day of a running streak alone, so the lesson finished next extends it", async () => {
    if (!configured) return;
    await signIn("running");

    const row = await readRow(ids.running);
    expect(row.lastActiveAt).toEqual(LESSON_DAY);

    // The lesson finished after the sign-in reads the row as completeLessonForUser does.
    const { event, state } = registerActivity(
      {
        currentStreak: row.streakDays,
        longestStreak: row.longestStreak,
        lastActiveDay: dayKey(row.lastActiveAt),
        freezes: row.streakFreezes,
      },
      NEXT_DAY,
    );
    expect(event).toBe("increment");
    expect(state.currentStreak).toBe(2);
  });

  it("moves the day of an account without a streak, as the inactivity notice needs", async () => {
    if (!configured) return;
    await signIn("broken");

    const row = await readRow(ids.broken);
    expect(row.lastActiveAt.getTime()).toBeGreaterThanOrEqual(STARTED.getTime());
  });

  it("does not overwrite a streak a lesson starts between the read and the write", async () => {
    if (!configured) return;

    // The sign-in's read runs for real and sees a streak of 0; the lesson then
    // commits its streak and its day; only after that does the sign-in write.
    // Prisma's upsert is generic over its options; this wrapper only hands them on.
    const upsert = prisma.user.upsert.bind(prisma.user) as (args: unknown) => Promise<unknown>;
    async function readThenLesson(args: unknown): Promise<unknown> {
      const read = await upsert(args);
      await prisma.user.update({
        where: { id: ids.racing },
        data: { streakDays: 1, longestStreak: 1, lastActiveAt: YESTERDAY },
      });
      return read;
    }
    // It stands in for the one upsert the repository makes, and answers as it did.
    vi.spyOn(prisma.user, "upsert").mockImplementationOnce(
      readThenLesson as unknown as typeof prisma.user.upsert,
    );

    await signIn("racing");

    const row = await readRow(ids.racing);
    expect(row.streakDays).toBe(1);
    expect(row.lastActiveAt).toEqual(YESTERDAY);
  });

  it("provisions a new account, whose first sign-in is its activity", async () => {
    if (!configured) return;
    const profile = await userRepository.upsertFromAuth({
      id: newcomerId,
      email: emailOf("newcomer"),
      displayName: "Nouvelle",
      avatarUrl: null,
    });
    expect(profile).toEqual({ username: null, role: "STUDENT" });

    const row = await readRow(newcomerId);
    expect(row.streakDays).toBe(0);
    expect(row.lastActiveAt.getTime()).toBeGreaterThanOrEqual(STARTED.getTime());
  });
});
