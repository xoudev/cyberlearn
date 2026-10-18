/**
 * The retired SM-2 queue on the real database, once migration
 * 20261018120000_retire_review_schedules has run.
 *
 * That migration lands minutes before the code that stops writing the queue:
 * .github/workflows/migrate.yml races the Vercel build. Meanwhile the previous
 * deployment still upserts a schedule at every first completion of a lesson,
 * into review_schedules, a view now. Were the view to refuse it, the whole
 * completion would roll back. These replay the statements that code sends
 * (what Prisma generated for its upsert, its grade and its reset) and check
 * they run and change nothing, and that the rows awaiting conversion stay
 * where db:backfill-review-cards reads them, and in the learner's GDPR export.
 *
 * What the clients get (an empty queue for the installed apps, nothing of the
 * legacy table) is in rls.integration.test.ts.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { reviewScheduleLegacyRepository } from "../repositories/review-schedule-legacy.repository.js";

const suffix = randomUUID().slice(0, 8);
const learner = randomUUID();
const legacyRow = randomUUID();
let lessonId = "";
let configured = false;

const now = new Date();
const tomorrow = new Date(now.getTime() + 86_400_000);

async function queueRows(): Promise<number> {
  const rows = await prisma.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM "public"."review_schedules" WHERE "userId" = ${learner}::uuid`;
  return rows[0]?.n ?? -1;
}

async function legacyRows(): Promise<string[]> {
  const rows = await prisma.reviewScheduleLegacy.findMany({
    where: { userId: learner },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

describe("the retired SM-2 queue (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;

    await prisma.user.create({
      data: { id: learner, email: `rs-learner-${suffix}@t.internal`, displayName: "Apprenant" },
    });
    const lesson = await prisma.lesson.create({
      data: {
        refCode: `RS-LSN-${suffix}-V01`,
        slug: `rs-lesson-${suffix}`,
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
    // A row written before the queue was retired, due yesterday, awaiting
    // its conversion into cards.
    await prisma.reviewScheduleLegacy.create({
      data: {
        id: legacyRow,
        userId: learner,
        lessonId,
        intervalDays: 6,
        repetitions: 2,
        nextReviewAt: new Date(now.getTime() - 86_400_000),
      },
    });
    configured = true;
  });

  afterAll(async () => {
    if (!configured) return;
    // The legacy row goes with its account (cascade).
    await prisma.user.deleteMany({ where: { id: learner } });
    await prisma.lesson.deleteMany({ where: { id: lessonId } });
  });

  it("shows nothing through the old name, not even the rows awaiting conversion", async () => {
    if (!configured) return;
    expect(await queueRows()).toBe(0);
    expect(await legacyRows()).toEqual([legacyRow]);
  });

  it("takes the previous deployment's upsert at a completion, and keeps nothing of it", async () => {
    if (!configured) return;
    const id = randomUUID();
    const returned = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "public"."review_schedules"
        ("id", "userId", "lessonId", "easeFactor", "intervalDays", "repetitions", "nextReviewAt", "lastReviewedAt")
      VALUES (${id}::uuid, ${learner}::uuid, ${lessonId}::uuid, 2.5, 1, 0, ${tomorrow}, ${now})
      RETURNING "id"`;
    // The row it was given comes back, as Prisma expects of an insert.
    expect(returned).toEqual([{ id }]);
    expect(await queueRows()).toBe(0);
    expect(await legacyRows()).toEqual([legacyRow]);
  });

  it("lets the previous deployment's grade and reset run, and they change nothing", async () => {
    if (!configured) return;
    const graded = await prisma.$executeRaw`
      UPDATE "public"."review_schedules"
      SET "easeFactor" = 2.6, "intervalDays" = 6, "repetitions" = 2,
          "nextReviewAt" = ${tomorrow}, "lastReviewedAt" = ${now}
      WHERE "userId" = ${learner}::uuid AND "nextReviewAt" <= ${now}`;
    const cleared = await prisma.$executeRaw`
      DELETE FROM "public"."review_schedules" WHERE "userId" = ${learner}::uuid`;
    expect([graded, cleared]).toEqual([0, 0]);
    expect(await legacyRows()).toEqual([legacyRow]);
  });

  it("lists the rows awaiting conversion in the learner's GDPR export, and nobody else's", async () => {
    if (!configured) return;
    const rows = await reviewScheduleLegacyRepository.listForExport(learner);
    expect(rows).toEqual([
      expect.objectContaining({
        lessonTitle: "Une leçon",
        lessonSlug: `rs-lesson-${suffix}`,
        intervalDays: 6,
        repetitions: 2,
      }),
    ]);
    expect(await reviewScheduleLegacyRepository.listForExport(randomUUID())).toEqual([]);
  });
});
