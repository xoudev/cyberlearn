/**
 * A path's average follows its ratings.
 *
 * The average is stored on the path, for the catalogue to show without
 * counting, and recomputed in the same transaction as each rating.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { ratingRepository } from "../repositories/rating.repository.js";

const suffix = randomUUID().slice(0, 8);
const ann = randomUUID();
const ben = randomUUID();
let pathId = "";
let configured = false;

describe("path ratings (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;
    await prisma.user.createMany({
      data: [
        { id: ann, email: `pr-a-${suffix}@t.internal`, displayName: "A" },
        { id: ben, email: `pr-b-${suffix}@t.internal`, displayName: "B" },
      ],
    });
    const path = await prisma.path.create({
      data: {
        refCode: `PR-PATH-${suffix}-V01`,
        slug: `pr-path-${suffix}`,
        title: "Un parcours",
        description: "Pour le test.",
        category: "DEV",
        difficulty: "BEGINNER",
        estimatedHours: 3,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
      select: { id: true },
    });
    pathId = path.id;
    configured = true;
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.rating.deleteMany({ where: { pathId } });
    await prisma.path.deleteMany({ where: { id: pathId } });
    await prisma.user.deleteMany({ where: { id: { in: [ann, ben] } } });
  });

  it("recomputes the average and the count with each rating", async () => {
    if (!configured) return;
    await ratingRepository.upsertPathRating(ann, pathId, 5, "Très clair.");
    await ratingRepository.upsertPathRating(ben, pathId, 2);
    expect(await ratingRepository.findPathStats(pathId)).toEqual({
      avgRating: 3.5,
      ratingsCount: 2,
    });
  });

  it("replaces a learner's rating rather than adding a second one", async () => {
    if (!configured) return;
    await ratingRepository.upsertPathRating(ben, pathId, 4, "Mieux après la mission 3.");
    expect(await ratingRepository.findPathStats(pathId)).toEqual({
      avgRating: 4.5,
      ratingsCount: 2,
    });
    expect(await ratingRepository.findUserPathRating(ben, pathId)).toMatchObject({
      score: 4,
      feedback: "Mieux après la mission 3.",
    });
  });

  it("lists the comments for the console, newest first", async () => {
    if (!configured) return;
    const rows = await ratingRepository.findPathRatings(pathId);
    expect(rows.map((r) => r.score)).toEqual([4, 5]);
    expect(rows[0]?.user?.displayName).toBe("B");
  });
});
