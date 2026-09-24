/**
 * What a reset clears, and what it must leave standing.
 *
 * The risk here is not that it fails: it is that it half-succeeds. A table
 * added to the platform and not to the wipe leaves a level-1 account holding
 * badges; a table wiped that should not be takes somebody's notes with their
 * XP. Both are silent, and both are only noticed by whoever the account
 * belongs to.
 *
 * So this seeds a learner with one row in everything the reset touches and one
 * row in several things it must not, runs it, and counts both sides.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { resetProgress } from "../progress/reset-progress.js";

const suffix = randomUUID().slice(0, 8);

const learner = randomUUID();
const admin = randomUUID();
const friend = randomUUID();

let lessonId = "";
let pathId = "";
let badgeId = "";
let noteId = "";
let ticketId = "";

let configured = false;

describe("resetProgress (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;

    await prisma.user.createMany({
      data: [
        {
          id: learner,
          email: `rp-learner-${suffix}@t.internal`,
          username: `rplearner${suffix}`,
          displayName: "Apprenant",
          bio: "Une bio qui doit survivre.",
          xpTotal: 4200,
          level: 9,
          streakDays: 12,
          longestStreak: 31,
          streakFreezes: 0,
        },
        { id: admin, email: `rp-admin-${suffix}@t.internal`, displayName: "Admin", role: "ADMIN" },
        { id: friend, email: `rp-friend-${suffix}@t.internal`, displayName: "Ami" },
      ],
    });

    const lesson = await prisma.lesson.create({
      data: {
        refCode: `RP-LSN-${suffix}-V01`,
        slug: `rp-lesson-${suffix}`,
        title: "Une leçon",
        description: "Pour le test.",
        category: "CYBERSEC",
        difficulty: "BEGINNER",
        estimatedMinutes: 10,
        xpReward: 50,
        contentMdx: "# Contenu",
        status: "PUBLISHED",
      },
      select: { id: true },
    });
    lessonId = lesson.id;

    const path = await prisma.path.create({
      data: {
        refCode: `RP-PATH-${suffix}-V01`,
        slug: `rp-path-${suffix}`,
        title: "Un parcours",
        description: "Pour le test.",
        category: "CYBERSEC",
        difficulty: "BEGINNER",
        estimatedHours: 4,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
      select: { id: true },
    });
    pathId = path.id;

    const badge = await prisma.badge.create({
      data: {
        refCode: `RP-BDG-${suffix}`,
        name: `Un badge ${suffix}`,
        description: "Pour le test.",
        iconUrl: "/badges/test.svg",
        rarity: "COMMON",
        criterionType: "LESSON_COMPLETED",
        criterionData: { count: 1 },
      },
      select: { id: true },
    });
    badgeId = badge.id;

    // Everything the reset is meant to clear.
    await prisma.userLessonProgress.create({
      data: { userId: learner, lessonId, status: "COMPLETED", completedAt: new Date() },
    });
    await prisma.userPathProgress.create({
      data: { userId: learner, pathId, status: "COMPLETED", completedAt: new Date() },
    });
    await prisma.userBadge.create({ data: { userId: learner, badgeId } });
    await prisma.reviewSchedule.create({
      data: { userId: learner, lessonId, nextReviewAt: new Date() },
    });
    await prisma.userActivityDay.create({
      data: { userId: learner, day: new Date("2026-03-04T00:00:00Z") },
    });
    await prisma.xpLedger.create({
      data: { userId: learner, amount: 50, source: "LESSON" },
    });
    await prisma.userSkipWaiver.create({ data: { userId: learner, lessonId } });
    await prisma.lessonQuizAnswer.create({
      data: { userId: learner, lessonId, quizId: "q-1", selected: 2, correct: false },
    });

    // And things it must leave alone.
    const note = await prisma.note.create({
      data: { userId: learner, lessonId, content: "À garder." },
      select: { id: true },
    });
    noteId = note.id;

    const ticket = await prisma.contactTicket.create({
      data: {
        userId: learner,
        email: `rp-learner-${suffix}@t.internal`,
        subject: `Demande ${suffix}`,
        theme: "QUESTION",
        message: "Une question.",
      },
      select: { id: true },
    });
    ticketId = ticket.id;

    await prisma.notification.create({
      data: { userId: learner, type: "ANNOUNCEMENT", title: "Un message", body: "À garder." },
    });
    // userA is the lower of the two ids by plain string comparison, which is
    // what the unique index is built on.
    const [low, high] = [learner, friend].sort();
    await prisma.friendship.create({
      data: {
        userAId: low ?? learner,
        userBId: high ?? friend,
        requestedById: learner,
        status: "ACCEPTED",
      },
    });

    configured = true;
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.friendship.deleteMany({
      where: { OR: [{ userAId: learner }, { userBId: learner }] },
    });
    await prisma.note.deleteMany({ where: { userId: learner } });
    await prisma.contactTicket.deleteMany({ where: { userId: learner } });
    await prisma.auditLog.deleteMany({ where: { targetId: learner } });
    await prisma.user.deleteMany({ where: { id: { in: [learner, admin, friend] } } });
    await prisma.lesson.deleteMany({ where: { id: lessonId } });
    await prisma.path.deleteMany({ where: { id: pathId } });
    await prisma.badge.deleteMany({ where: { id: badgeId } });
  });

  it("puts the counters on the row back to a first day", async () => {
    if (!configured) return;
    await resetProgress(learner, { actorId: admin });

    const row = await prisma.user.findUnique({
      where: { id: learner },
      select: {
        xpTotal: true,
        level: true,
        streakDays: true,
        longestStreak: true,
        streakFreezes: true,
      },
    });
    expect(row).toEqual({
      xpTotal: 0,
      level: 1,
      streakDays: 0,
      longestStreak: 0,
      // The schema's own default, not zero: a reset must not be harsher than a
      // brand new account.
      streakFreezes: 1,
    });
  });

  it("clears every table the progression lives in", async () => {
    if (!configured) return;
    const counts = {
      lessons: await prisma.userLessonProgress.count({ where: { userId: learner } }),
      paths: await prisma.userPathProgress.count({ where: { userId: learner } }),
      badges: await prisma.userBadge.count({ where: { userId: learner } }),
      reviews: await prisma.reviewSchedule.count({ where: { userId: learner } }),
      activity: await prisma.userActivityDay.count({ where: { userId: learner } }),
      ledger: await prisma.xpLedger.count({ where: { userId: learner } }),
      waivers: await prisma.userSkipWaiver.count({ where: { userId: learner } }),
      quizAnswers: await prisma.lessonQuizAnswer.count({ where: { userId: learner } }),
    };
    expect(counts).toEqual({
      lessons: 0,
      paths: 0,
      badges: 0,
      reviews: 0,
      activity: 0,
      ledger: 0,
      waivers: 0,
      quizAnswers: 0,
    });
  });

  it("leaves the account, and everything that is not progression, standing", async () => {
    if (!configured) return;
    const row = await prisma.user.findUnique({
      where: { id: learner },
      select: { username: true, displayName: true, bio: true, email: true },
    });
    expect(row?.username).toBe(`rplearner${suffix}`);
    expect(row?.displayName).toBe("Apprenant");
    expect(row?.bio).toBe("Une bio qui doit survivre.");

    expect(await prisma.note.count({ where: { id: noteId } })).toBe(1);
    expect(await prisma.contactTicket.count({ where: { id: ticketId } })).toBe(1);
    expect(await prisma.notification.count({ where: { userId: learner } })).toBe(1);
    expect(
      await prisma.friendship.count({
        where: { OR: [{ userAId: learner }, { userBId: learner }] },
      }),
    ).toBe(1);
  });

  it("reports what it cleared, and writes it to the audit log", async () => {
    if (!configured) return;
    // A second learner, so the counts are the ones this call cleared rather
    // than what the first test left behind.
    const other = randomUUID();
    await prisma.user.create({
      data: {
        id: other,
        email: `rp-other-${suffix}@t.internal`,
        displayName: "Autre",
        xpTotal: 1500,
        level: 5,
      },
    });
    await prisma.userLessonProgress.create({
      data: { userId: other, lessonId, status: "COMPLETED" },
    });
    await prisma.userBadge.create({ data: { userId: other, badgeId } });

    const summary = await resetProgress(other, { actorId: admin });

    expect(summary.xpCleared).toBe(1500);
    expect(summary.levelBefore).toBe(5);
    expect(summary.lessonsCleared).toBe(1);
    expect(summary.badgesCleared).toBe(1);

    const entry = await prisma.auditLog.findFirst({
      where: { targetId: other, action: "admin.user.progress.reset" },
      select: { actorId: true, targetType: true, metadata: true },
    });
    expect(entry?.actorId).toBe(admin);
    expect(entry?.targetType).toBe("User");
    expect(entry?.metadata).toMatchObject({ xpCleared: 1500, badgesCleared: 1 });

    await prisma.auditLog.deleteMany({ where: { targetId: other } });
    await prisma.user.delete({ where: { id: other } });
  });

  it("refuses an account that does not exist rather than half-running", async () => {
    if (!configured) return;
    await expect(resetProgress(randomUUID(), { actorId: admin })).rejects.toThrow(/no such user/iu);
  });

  it("can be run twice without failing on the second", async () => {
    if (!configured) return;
    // The console's own retry: somebody pressing it again after a timeout must
    // not get an error from rows that are already gone.
    const summary = await resetProgress(learner, { actorId: admin });
    expect(summary.xpCleared).toBe(0);
    expect(summary.lessonsCleared).toBe(0);
  });
});
