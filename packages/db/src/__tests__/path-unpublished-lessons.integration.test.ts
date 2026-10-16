/**
 * A published path with a lesson linked to it that is not published.
 *
 * The link happens two ways: the catalogue sync links a lesson imported as a
 * draft, and archiving a lesson leaves its links in place. Read as a mission,
 * that lesson made the path impossible to finish (which closed the exam and
 * the certificate) and put its recap on the module's revision sheet. These
 * reads now count the published lessons only, and this holds them to it.
 *
 * Counting them out must not swing the other way: a path whose every link is
 * a draft or an archived lesson has no mission left, and that is not a path
 * the learner finished. Read as one, it opened the exam and the certificate
 * for zero lessons.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { lessonRepository } from "../repositories/lesson.repository.js";
import { pathRepository } from "../repositories/path.repository.js";
import { statsRepository } from "../repositories/stats.repository.js";

const suffix = randomUUID().slice(0, 8);

const admin = randomUUID();
const learner = randomUUID();
const USER_IDS = [admin, learner];

let pathId = "";
const pathSlug = `parcours-brouillon-${suffix}`;
let unpublishedPathId = "";
let firstId = "";
let draftId = "";
let archivedId = "";
let lastId = "";

let configured = false;

async function makeLesson(n: number, status: "PUBLISHED" | "DRAFT" | "ARCHIVED"): Promise<string> {
  const lesson = await prisma.lesson.create({
    data: {
      refCode: `UP-LSN-${suffix.slice(0, 3)}-V0${String(n)}`,
      slug: `lecon-brouillon-${String(n)}-${suffix}`,
      title: `Leçon ${String(n)} ${suffix}`,
      description: "Une leçon du parcours",
      category: "NETWORK",
      difficulty: "BEGINNER",
      estimatedMinutes: 10,
      xpReward: 10,
      contentMdx: `# Leçon ${String(n)}\n\n## À retenir\n\n- Le point ${String(n)}.`,
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
      authorId: admin,
    },
    select: { id: true },
  });
  return lesson.id;
}

describe("unpublished lessons in a published path (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;

    await prisma.user.createMany({
      data: [
        { id: admin, email: `ua-${suffix}@t.internal`, displayName: "Admin", role: "ADMIN" },
        { id: learner, email: `ul-${suffix}@t.internal`, displayName: "Élève", role: "STUDENT" },
      ],
    });

    firstId = await makeLesson(1, "PUBLISHED");
    draftId = await makeLesson(2, "DRAFT");
    archivedId = await makeLesson(3, "ARCHIVED");
    lastId = await makeLesson(4, "PUBLISHED");

    const path = await prisma.path.create({
      data: {
        refCode: `UP-PATH-${suffix.slice(0, 3)}-V01`,
        slug: pathSlug,
        title: `Parcours ${suffix}`,
        description: "Un parcours du catalogue",
        category: "NETWORK",
        difficulty: "BEGINNER",
        estimatedHours: 2,
        status: "PUBLISHED",
        publishedAt: new Date(),
        lessons: {
          create: [
            { lessonId: firstId, position: 1 },
            { lessonId: draftId, position: 2 },
            { lessonId: archivedId, position: 3 },
            { lessonId: lastId, position: 4 },
          ],
        },
      },
      select: { id: true },
    });
    pathId = path.id;

    // Published, with only a draft and an archived lesson linked to it.
    const unpublished = await prisma.path.create({
      data: {
        refCode: `UP-PATH-${suffix.slice(0, 3)}-V02`,
        slug: `parcours-sans-mission-${suffix}`,
        title: `Parcours vide ${suffix}`,
        description: "Un parcours du catalogue sans leçon publiée",
        category: "NETWORK",
        difficulty: "BEGINNER",
        estimatedHours: 1,
        status: "PUBLISHED",
        publishedAt: new Date(),
        lessons: {
          create: [
            { lessonId: draftId, position: 1 },
            { lessonId: archivedId, position: 2 },
          ],
        },
      },
      select: { id: true },
    });
    unpublishedPathId = unpublished.id;

    // The learner finished both published lessons, and the archived one back
    // when it was still published.
    await prisma.userLessonProgress.createMany({
      data: [firstId, archivedId, lastId].map((lessonId) => ({
        userId: learner,
        lessonId,
        status: "COMPLETED" as const,
        completedAt: new Date(),
      })),
    });

    configured = true;
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.path.deleteMany({ where: { id: { in: [pathId, unpublishedPathId] } } });
    await prisma.lesson.deleteMany({
      where: { id: { in: [firstId, draftId, archivedId, lastId] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: USER_IDS } } });
  });

  it("asks for the published lessons only", async () => {
    if (!configured) return;
    const ids = await pathRepository.findLessonIds(pathId);
    expect([...ids].sort()).toEqual([firstId, lastId].sort());
  });

  it("does not count the archived lesson the learner had finished", async () => {
    if (!configured) return;
    expect(await pathRepository.countCompletedLessons(learner, pathId)).toBe(2);
  });

  it("lets the learner finish the path, which opens the exam and the certificate", async () => {
    if (!configured) return;
    expect(await pathRepository.areLessonsComplete(learner, pathId)).toBe(true);
  });

  it("never finishes a path whose only lessons are a draft and an archived one", async () => {
    if (!configured) return;
    // The learner finished the archived lesson; nothing published is left.
    expect(await pathRepository.findLessonIds(unpublishedPathId)).toEqual([]);
    expect(await pathRepository.areLessonsComplete(learner, unpublishedPathId)).toBe(false);
  });

  it("cuts the revision sheet from the published lessons", async () => {
    if (!configured) return;
    const outline = await pathRepository.findSheetOutline(pathSlug, learner);
    expect(outline?.lessons.map((l) => l.lessonId)).toEqual([firstId, lastId]);
  });

  it("never returns the recap of an unpublished lesson, even asked by id", async () => {
    if (!configured) return;
    const sources = await lessonRepository.findRecapSources([firstId, draftId, archivedId]);
    expect(sources.map((s) => s.id)).toEqual([firstId]);
  });

  it("announces the published lessons on the public catalogue card", async () => {
    if (!configured) return;
    const card = (await statsRepository.findPublicCatalog()).find((p) => p.slug === pathSlug);
    expect(card).toMatchObject({ lessons: 2, xp: 20 });
  });
});
