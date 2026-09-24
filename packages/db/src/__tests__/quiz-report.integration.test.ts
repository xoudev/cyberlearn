/**
 * Reports on lesson quizzes, against the real database.
 *
 * One report per learner and question, reopened when filed again; grouped by
 * question for the console; kept, without a name, when the account goes.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { quizReportRepository } from "../repositories/quiz-report.repository.js";

const suffix = randomUUID().slice(0, 8);
const learner = randomUUID();
const other = randomUUID();
let lessonId = "";
let configured = false;

describe("quizReportRepository (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;
    await prisma.user.createMany({
      data: [
        {
          id: learner,
          email: `qr-a-${suffix}@t.internal`,
          displayName: "A",
          username: `qra${suffix}`,
        },
        { id: other, email: `qr-b-${suffix}@t.internal`, displayName: "B" },
      ],
    });
    const lesson = await prisma.lesson.create({
      data: {
        refCode: `QR-LSN-${suffix}-V01`,
        slug: `qr-lesson-${suffix}`,
        title: "Cadres et normes",
        description: "Pour le test.",
        category: "CYBERSEC",
        difficulty: "BEGINNER",
        estimatedMinutes: 5,
        xpReward: 10,
        contentMdx: "# Contenu",
        status: "PUBLISHED",
      },
      select: { id: true },
    });
    lessonId = lesson.id;
    configured = true;
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.quizReport.deleteMany({ where: { lessonId } });
    await prisma.user.deleteMany({ where: { id: { in: [learner, other] } } });
    await prisma.lesson.deleteMany({ where: { id: lessonId } });
  });

  it("keeps one report per learner and question, updated when filed again", async () => {
    if (!configured) return;
    await quizReportRepository.upsert(learner, lessonId, "q-1", "TYPO", null);
    await quizReportRepository.upsert(
      learner,
      lessonId,
      "q-1",
      "AMBIGUOUS",
      "Deux lectures possibles.",
    );
    const rows = await prisma.quizReport.findMany({ where: { userId: learner, lessonId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ reason: "AMBIGUOUS", comment: "Deux lectures possibles." });
    expect(await quizReportRepository.openQuizIdsFor(learner, lessonId)).toEqual(["q-1"]);
  });

  it("groups open reports by question, the most reported first", async () => {
    if (!configured) return;
    await quizReportRepository.upsert(other, lessonId, "q-1", "WRONG_ANSWER", null);
    await quizReportRepository.upsert(other, lessonId, "q-2", "OTHER", null);
    const mine = (await quizReportRepository.openByQuiz()).filter((g) => g.lessonId === lessonId);
    expect(mine.map((g) => [g.quizId, g.reports.length])).toEqual([
      ["q-1", 2],
      ["q-2", 1],
    ]);
    expect(mine[0]?.lessonTitle).toBe("Cadres et normes");
    expect(mine[0]?.reports.map((r) => r.username)).toContain(`qra${suffix}`);
  });

  it("closes a question's reports, and a new report reopens the reporter's", async () => {
    if (!configured) return;
    expect(await quizReportRepository.resolveQuiz(lessonId, "q-1")).toBe(2);
    expect(await quizReportRepository.openQuizIdsFor(learner, lessonId)).toEqual([]);
    await quizReportRepository.upsert(learner, lessonId, "q-1", "WRONG_ANSWER", null);
    const row = await prisma.quizReport.findFirst({ where: { userId: learner, quizId: "q-1" } });
    expect(row).toMatchObject({ status: "OPEN", resolvedAt: null });
  });

  it("counts a learner's recent reports for the hourly limit", async () => {
    if (!configured) return;
    const since = new Date(Date.now() - 60 * 60 * 1000);
    expect(await quizReportRepository.countSince(learner, since)).toBe(1);
    expect(await quizReportRepository.countSince(other, since)).toBe(2);
  });

  it("keeps a report without a name when the account is erased", async () => {
    if (!configured) return;
    await prisma.user.delete({ where: { id: other } });
    const orphans = await prisma.quizReport.findMany({ where: { lessonId, userId: null } });
    expect(orphans.map((r) => r.quizId).sort()).toEqual(["q-1", "q-2"]);
  });
});
