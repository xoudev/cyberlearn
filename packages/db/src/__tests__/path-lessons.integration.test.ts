/**
 * The console's writes to a path's lessons, against Postgres: the unique
 * (pathId, position) has to accept every reorder, and a lesson's module has
 * to survive a save. Saving a path used to delete its links and recreate them
 * without moduleId, which emptied the modules the sync had filled.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { lessonRepository } from "../repositories/lesson.repository.js";
import { pathRepository } from "../repositories/path.repository.js";

const suffix = randomUUID().slice(0, 8);

let pathId = "";
let firstModule = "";
let secondModule = "";
const lessonIds: string[] = [];

let configured = false;

async function makeLesson(n: number): Promise<string> {
  const lesson = await prisma.lesson.create({
    data: {
      refCode: `PL-LSN-${suffix}-${String(n)}`,
      slug: `lecon-parcours-${String(n)}-${suffix}`,
      title: `Leçon ${String(n)} ${suffix}`,
      description: "Une leçon du parcours",
      category: "DEV",
      difficulty: "BEGINNER",
      estimatedMinutes: 10,
      xpReward: 10,
      contentMdx: `# Leçon ${String(n)}`,
    },
    select: { id: true },
  });
  return lesson.id;
}

/** The path's links in order, as [lessonId, position, moduleId]. */
async function links(): Promise<[string, number, string | null][]> {
  const rows = await prisma.pathLesson.findMany({
    where: { pathId },
    orderBy: { position: "asc" },
    select: { lessonId: true, position: true, moduleId: true },
  });
  return rows.map((row) => [row.lessonId, row.position, row.moduleId]);
}

/** Lesson n of the run, which every test below has created. */
function lesson(n: number): string {
  const id = lessonIds[n];
  if (id === undefined) throw new Error(`no lesson ${String(n)}`);
  return id;
}

describe("console writes to a path's lessons (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;

    for (let n = 0; n < 5; n++) lessonIds.push(await makeLesson(n));

    const path = await prisma.path.create({
      data: {
        refCode: `PL-PATH-${suffix}`,
        slug: `parcours-modules-${suffix}`,
        title: `Parcours ${suffix}`,
        description: "Un parcours en deux modules",
        category: "DEV",
        difficulty: "BEGINNER",
        estimatedHours: 2,
      },
      select: { id: true },
    });
    pathId = path.id;
    firstModule = (
      await prisma.pathModule.create({
        data: { pathId, position: 1, title: "Premier module" },
        select: { id: true },
      })
    ).id;
    secondModule = (
      await prisma.pathModule.create({
        data: { pathId, position: 2, title: "Second module" },
        select: { id: true },
      })
    ).id;
    // As the sync writes it: 1-based, filed into modules.
    await prisma.pathLesson.createMany({
      data: [
        { pathId, lessonId: lesson(0), position: 1, moduleId: firstModule },
        { pathId, lessonId: lesson(1), position: 2, moduleId: firstModule, isRequired: false },
        { pathId, lessonId: lesson(2), position: 3, moduleId: secondModule },
      ],
    });

    configured = true;
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.path.deleteMany({ where: { id: pathId } });
    await prisma.lesson.deleteMany({ where: { id: { in: lessonIds } } });
  });

  it("reorders, adds and removes without losing a module", async () => {
    if (!configured) return;
    await prisma.$transaction((tx) =>
      pathRepository.replaceLessons(pathId, [lesson(1), lesson(0), lesson(3), lesson(2)], tx),
    );
    expect(await links()).toEqual([
      [lesson(1), 1, firstModule],
      [lesson(0), 2, firstModule],
      [lesson(3), 3, firstModule],
      [lesson(2), 4, secondModule],
    ]);
    const flag = await prisma.pathLesson.findUnique({
      where: { pathId_lessonId: { pathId, lessonId: lesson(1) } },
      select: { isRequired: true },
    });
    expect(flag?.isRequired).toBe(false);
  });

  it("adds a lesson at the end of the last module", async () => {
    if (!configured) return;
    await prisma.$transaction((tx) => pathRepository.attachLesson(pathId, lesson(4), tx));
    expect((await links()).at(-1)).toEqual([lesson(4), 5, secondModule]);
  });

  it("closes the gap a removed lesson leaves", async () => {
    if (!configured) return;
    await prisma.$transaction((tx) => pathRepository.detachLesson(pathId, lesson(0), tx));
    expect(await links()).toEqual([
      [lesson(1), 1, firstModule],
      [lesson(3), 2, firstModule],
      [lesson(2), 3, secondModule],
      [lesson(4), 4, secondModule],
    ]);
  });

  it("replaces a lesson's prerequisites", async () => {
    if (!configured) return;
    await lessonRepository.replacePrerequisites(lesson(4), [lesson(1), lesson(2)]);
    await lessonRepository.replacePrerequisites(lesson(4), [lesson(3)]);
    const edges = (await lessonRepository.findPrerequisiteEdges()).filter(
      (edge) => edge.lessonId === lesson(4),
    );
    expect(edges).toEqual([{ lessonId: lesson(4), prerequisiteId: lesson(3) }]);
  });
});
