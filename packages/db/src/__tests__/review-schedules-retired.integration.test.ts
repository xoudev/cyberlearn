/**
 * The retired SM-2 queue on the real database, once migrations
 * 20261018120000_retire_review_schedules and
 * 20261023120000_drop_review_schedules_legacy have run.
 *
 * Its table, review_schedules_legacy, is dropped. What stays is the name the
 * installed app builds read through the Data API: review_schedules, an empty
 * view built on review_cards. These check that the view outlived the table,
 * that it does not depend on it, and that it still takes and drops the writes
 * of a deployment that predates the cards: .github/workflows/migrate.yml
 * races the Vercel build, so a migration lands minutes before the code that
 * no longer writes the queue. That deployment still upserts a schedule at
 * every first completion of a lesson, and were the view to refuse it, the
 * whole completion would roll back. The statements replayed are what Prisma
 * generated for its upsert, its grade and its reset.
 *
 * What the clients get (an empty queue for the installed apps, nothing of the
 * dropped table) is in rls.integration.test.ts.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";

const suffix = randomUUID().slice(0, 8);
const learner = randomUUID();
let lessonId = "";
let configured = false;

const now = new Date();
const tomorrow = new Date(now.getTime() + 86_400_000);

async function queueRows(): Promise<number> {
  const rows = await prisma.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM "public"."review_schedules" WHERE "userId" = ${learner}::uuid`;
  return rows[0]?.n ?? -1;
}

async function cardRows(): Promise<number> {
  return prisma.reviewCard.count({ where: { userId: learner } });
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
    configured = true;
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.user.deleteMany({ where: { id: learner } });
    await prisma.lesson.deleteMany({ where: { id: lessonId } });
  });

  it("has dropped the legacy table, and kept the old name as a view", async () => {
    if (!configured) return;
    const rows = await prisma.$queryRaw<{ legacy: string | null; kind: string | null }[]>`
      SELECT
        to_regclass('public.review_schedules_legacy')::text AS legacy,
        (SELECT c.relkind::text FROM pg_class c
           WHERE c.oid = to_regclass('public.review_schedules')) AS kind`;
    expect(rows).toEqual([{ legacy: null, kind: "v" }]);
  });

  it("builds the view on the review cards, not on a table that can go", async () => {
    if (!configured) return;
    // The relations the view's rewrite rule reads: review_cards only.
    const tables = await prisma.$queryRaw<{ name: string }[]>`
      SELECT DISTINCT d.refobjid::regclass::text AS name
      FROM pg_depend d
      JOIN pg_rewrite r ON r.oid = d.objid AND d.classid = 'pg_rewrite'::regclass
      WHERE r.ev_class = 'public.review_schedules'::regclass
        AND d.refclassid = 'pg_class'::regclass
        AND d.refobjid <> 'public.review_schedules'::regclass
      ORDER BY 1`;
    expect(tables.map((row) => row.name.replace(/^public\./u, ""))).toEqual(["review_cards"]);
  });

  it("shows an empty queue through the old name", async () => {
    if (!configured) return;
    expect(await queueRows()).toBe(0);
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
    // And nothing was written behind the view: no card appeared either.
    expect(await cardRows()).toBe(0);
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
    expect(await cardRows()).toBe(0);
  });
});
