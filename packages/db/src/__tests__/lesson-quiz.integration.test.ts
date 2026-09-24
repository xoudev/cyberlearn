/**
 * One attempt per quiz, enforced by the database.
 *
 * A wrong answer used to be retried until it was right. The rule is now "the
 * first answer stays", and it has to survive what a page cannot prevent: a
 * double click, a second tab, a request replayed by hand.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { lessonQuizRepository } from "../repositories/lesson-quiz.repository.js";

const suffix = randomUUID().slice(0, 8);
const learner = randomUUID();
const other = randomUUID();
let lessonId = "";
let configured = false;

describe("lessonQuizRepository (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;
    await prisma.user.createMany({
      data: [
        { id: learner, email: `lq-a-${suffix}@t.internal`, displayName: "A" },
        { id: other, email: `lq-b-${suffix}@t.internal`, displayName: "B" },
      ],
    });
    const lesson = await prisma.lesson.create({
      data: {
        refCode: `LQ-LSN-${suffix}-V01`,
        slug: `lq-lesson-${suffix}`,
        title: "Une leçon",
        description: "Pour le test.",
        category: "DEV",
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
    await prisma.user.deleteMany({ where: { id: { in: [learner, other] } } });
    await prisma.lesson.deleteMany({ where: { id: lessonId } });
  });

  it("keeps the first answer and hands it back to a second one", async () => {
    if (!configured) return;
    const first = await lessonQuizRepository.recordFirst(learner, lessonId, {
      quizId: "q-1",
      selected: 2,
      correct: false,
    });
    expect(first).toEqual({ quizId: "q-1", selected: 2, correct: false });

    // The retry the page no longer offers, attempted anyway.
    const second = await lessonQuizRepository.recordFirst(learner, lessonId, {
      quizId: "q-1",
      selected: 1,
      correct: true,
    });
    expect(second).toEqual({ quizId: "q-1", selected: 2, correct: false });
  });

  it("stores one row when two submissions race", async () => {
    if (!configured) return;
    const results = await Promise.all(
      [0, 1, 2, 3].map((selected) =>
        lessonQuizRepository.recordFirst(learner, lessonId, {
          quizId: "q-race",
          selected,
          correct: selected === 1,
        }),
      ),
    );
    expect(
      await prisma.lessonQuizAnswer.count({ where: { userId: learner, quizId: "q-race" } }),
    ).toBe(1);
    // Everybody is told the same answer: the one that won.
    expect(new Set(results.map((r) => r.selected)).size).toBe(1);
  });

  it("keeps each person's answers to themselves", async () => {
    if (!configured) return;
    await lessonQuizRepository.recordFirst(other, lessonId, {
      quizId: "q-1",
      selected: 1,
      correct: true,
    });
    const mine = await lessonQuizRepository.findForLesson(learner, lessonId);
    const theirs = await lessonQuizRepository.findForLesson(other, lessonId);
    expect(mine.find((a) => a.quizId === "q-1")?.selected).toBe(2);
    expect(theirs).toEqual([{ quizId: "q-1", selected: 1, correct: true }]);
  });

  it("goes when the account goes", async () => {
    if (!configured) return;
    const gone = randomUUID();
    await prisma.user.create({
      data: { id: gone, email: `lq-c-${suffix}@t.internal`, displayName: "C" },
    });
    await lessonQuizRepository.recordFirst(gone, lessonId, {
      quizId: "q-1",
      selected: 0,
      correct: false,
    });
    await prisma.user.delete({ where: { id: gone } });
    expect(await prisma.lessonQuizAnswer.count({ where: { userId: gone } })).toBe(0);
  });
});
