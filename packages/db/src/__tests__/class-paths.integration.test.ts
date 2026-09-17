/**
 * A path a teacher built for one class, and everywhere it must not turn up.
 *
 * This is the leak test, and it is the same one the class lessons needed a
 * release earlier. A CLASS path is PUBLISHED - the class has to be able to open
 * it - so every read that used to mean "published" and now means "in the
 * catalogue" is a place it could escape through: the public list of paths, the
 * lookup by slug, the platform's own figures, and the certificate machinery.
 * They all read one rule, and this is what holds them to it.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { classRepository } from "../repositories/class.repository.js";
import { CATALOGUE_PATH, pathRepository, pathsVisibleTo } from "../repositories/path.repository.js";
import { statsRepository } from "../repositories/stats.repository.js";

const suffix = randomUUID().slice(0, 8);

const establishmentId = randomUUID();
const promotionId = randomUUID();
const classId = randomUUID();
const otherClassId = randomUUID();

const teacher = randomUUID();
const coTeacher = randomUUID();
const otherTeacher = randomUUID();
const student = randomUUID();
const outsider = randomUUID();
const admin = randomUUID();
const USER_IDS = [teacher, coTeacher, otherTeacher, student, outsider, admin];

let cataloguePathId = "";
let classPathId = "";
let classPathSlug = "";
const lessonIds: string[] = [];

let configured = false;

async function makeLesson(n: number): Promise<string> {
  const lesson = await prisma.lesson.create({
    data: {
      refCode: `CP-LSN-${suffix.slice(0, 3)}-V0${String(n)}`,
      slug: `parcours-lecon-${String(n)}-${suffix}`,
      title: `Leçon ${String(n)} ${suffix}`,
      description: "Une leçon du catalogue",
      category: "CYBERSEC",
      difficulty: "BEGINNER",
      estimatedMinutes: 10,
      xpReward: 10,
      contentMdx: "# leçon",
      status: "PUBLISHED",
      publishedAt: new Date(),
      authorId: admin,
    },
    select: { id: true },
  });
  return lesson.id;
}

describe("class paths (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;

    await prisma.user.createMany({
      data: [
        { id: teacher, email: `pt-${suffix}@t.internal`, displayName: "Prof", role: "TEACHER" },
        { id: coTeacher, email: `pc-${suffix}@t.internal`, displayName: "Co", role: "TEACHER" },
        {
          id: otherTeacher,
          email: `po-${suffix}@t.internal`,
          displayName: "Autre",
          role: "TEACHER",
        },
        { id: student, email: `ps-${suffix}@t.internal`, displayName: "Élève", role: "STUDENT" },
        { id: outsider, email: `px-${suffix}@t.internal`, displayName: "Dehors", role: "STUDENT" },
        { id: admin, email: `pa-${suffix}@t.internal`, displayName: "Admin", role: "ADMIN" },
      ],
    });
    await prisma.establishment.create({
      data: {
        id: establishmentId,
        name: `Lycée ${suffix}`,
        slug: `lycee-${suffix}`,
        promotions: {
          create: {
            id: promotionId,
            name: `Promo ${suffix}`,
            slug: `promo-${suffix}`,
            classes: {
              create: [
                { id: classId, name: `Classe ${suffix}`, slug: `classe-${suffix}` },
                { id: otherClassId, name: `Autre ${suffix}`, slug: `autre-${suffix}` },
              ],
            },
          },
        },
      },
    });
    await prisma.classTeacher.createMany({
      data: [
        { classId, teacherId: teacher },
        { classId, teacherId: coTeacher },
        { classId: otherClassId, teacherId: otherTeacher },
      ],
    });
    await prisma.classMember.create({ data: { classId, userId: student } });

    lessonIds.push(await makeLesson(1), await makeLesson(2), await makeLesson(3));

    const catalogue = await prisma.path.create({
      data: {
        refCode: `CP-PATH-${suffix.slice(0, 3)}-V01`,
        slug: `catalogue-parcours-${suffix}`,
        title: `Catalogue ${suffix}`,
        description: "Un parcours du catalogue",
        category: "CYBERSEC",
        difficulty: "BEGINNER",
        estimatedHours: 4,
        status: "PUBLISHED",
        publishedAt: new Date(),
        lessons: { create: [{ lessonId: lessonIds[0] ?? "", position: 1 }] },
      },
      select: { id: true },
    });
    cataloguePathId = catalogue.id;

    const built = await classRepository.createClassPath({
      classId,
      authorId: teacher,
      title: `Révisions ${suffix}`,
      description: "Construit pour la classe",
      category: "CYBERSEC",
      difficulty: "BEGINNER",
      estimatedHours: 3,
      // Deliberately not in catalogue order: the point of a path is the order.
      lessonIds: [lessonIds[2] ?? "", lessonIds[0] ?? "", lessonIds[1] ?? ""],
    });
    classPathId = built.id;
    classPathSlug = built.slug;

    configured = true;
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.path.deleteMany({ where: { id: { in: [cataloguePathId, classPathId] } } });
    await prisma.lesson.deleteMany({ where: { id: { in: lessonIds } } });
    await prisma.establishment.deleteMany({ where: { id: establishmentId } });
    await prisma.user.deleteMany({ where: { id: { in: USER_IDS } } });
  });

  async function slugsFor(userId: string): Promise<string[]> {
    const rows = await prisma.path.findMany({
      where: pathsVisibleTo(userId),
      select: { slug: true },
    });
    return rows.map((r) => r.slug);
  }

  describe("it is published, and still not the catalogue's", () => {
    it("is published, which is exactly why 'published' stopped being the rule", async () => {
      if (!configured) return;
      const row = await prisma.path.findUnique({
        where: { id: classPathId },
        select: { status: true, audience: true },
      });
      expect(row?.status).toBe("PUBLISHED");
      expect(row?.audience).toBe("CLASS");
    });

    it("is absent from the catalogue filter every public read uses", async () => {
      if (!configured) return;
      const catalogue = await prisma.path.findMany({
        where: CATALOGUE_PATH,
        select: { id: true },
      });
      const ids = catalogue.map((p) => p.id);
      expect(ids).toContain(cataloguePathId);
      expect(ids).not.toContain(classPathId);
    });

    it("is not counted in the figures the landing page prints", async () => {
      if (!configured) return;
      const before = await statsRepository.findLandingStats();

      // A second class path must move nothing: the figure counts the catalogue.
      const extra = await classRepository.createClassPath({
        classId,
        authorId: teacher,
        title: `Bis ${suffix}`,
        description: "Un deuxième parcours de classe",
        category: "CYBERSEC",
        difficulty: "BEGINNER",
        estimatedHours: 1,
        lessonIds: [lessonIds[0] ?? ""],
      });
      const after = await statsRepository.findLandingStats();
      await prisma.path.delete({ where: { id: extra.id } });

      expect(after.publishedPaths).toBe(before.publishedPaths);
    });
  });

  describe("who can open it", () => {
    it("is reachable by the class, its teachers and an outsider is refused", async () => {
      if (!configured) return;
      expect(await slugsFor(student)).toContain(classPathSlug);
      expect(await slugsFor(teacher)).toContain(classPathSlug);
      expect(await slugsFor(coTeacher)).toContain(classPathSlug);

      // A teacher of another class knows the slug and still gets nothing.
      expect(await slugsFor(otherTeacher)).not.toContain(classPathSlug);
      expect(await slugsFor(outsider)).not.toContain(classPathSlug);
    });

    it("does not hide the catalogue from anyone", async () => {
      if (!configured) return;
      for (const who of [student, teacher, otherTeacher, outsider]) {
        expect(await slugsFor(who)).toContain(`catalogue-parcours-${suffix}`);
      }
    });

    it("refuses a lookup by slug from someone outside the class", async () => {
      if (!configured) return;
      expect(await pathRepository.findBySlug(classPathSlug, student)).not.toBeNull();
      expect(await pathRepository.findBySlug(classPathSlug, outsider)).toBeNull();
    });
  });

  describe("the order is the point", () => {
    it("keeps the lessons in the order the teacher gave, not the catalogue's", async () => {
      if (!configured) return;
      const rows = await prisma.pathLesson.findMany({
        where: { pathId: classPathId },
        orderBy: { position: "asc" },
        select: { lessonId: true, position: true },
      });
      expect(rows.map((r) => r.lessonId)).toEqual([lessonIds[2], lessonIds[0], lessonIds[1]]);
      expect(rows.map((r) => r.position)).toEqual([1, 2, 3]);
    });

    it("rewrites the whole order on save, leaving no gap behind", async () => {
      if (!configured) return;
      await classRepository.updateClassPath(classPathId, {
        title: `Révisions ${suffix}`,
        description: "Construit pour la classe",
        category: "CYBERSEC",
        difficulty: "BEGINNER",
        estimatedHours: 3,
        // One lesson removed and the two survivors swapped: positions have a
        // unique constraint per path, so a row-by-row patch would collide.
        lessonIds: [lessonIds[1] ?? "", lessonIds[2] ?? ""],
      });

      const rows = await prisma.pathLesson.findMany({
        where: { pathId: classPathId },
        orderBy: { position: "asc" },
        select: { lessonId: true, position: true },
      });
      expect(rows.map((r) => r.lessonId)).toEqual([lessonIds[1], lessonIds[2]]);
      expect(rows.map((r) => r.position)).toEqual([1, 2]);
    });
  });

  describe("editing", () => {
    it("lets its author and a co-teacher of the class edit it", async () => {
      if (!configured) return;
      expect(await classRepository.canEditClassPath(teacher, classPathId)).toBe(true);
      expect(await classRepository.canEditClassPath(coTeacher, classPathId)).toBe(true);
    });

    it("refuses a teacher of another class and a student", async () => {
      if (!configured) return;
      expect(await classRepository.canEditClassPath(otherTeacher, classPathId)).toBe(false);
      expect(await classRepository.canEditClassPath(student, classPathId)).toBe(false);
    });

    it("nobody reaches a catalogue path through this door", async () => {
      if (!configured) return;
      expect(await classRepository.canEditClassPath(teacher, cataloguePathId)).toBe(false);
    });

    it("refuses to rewrite a catalogue path, whatever id it is given", async () => {
      if (!configured) return;
      const before = await prisma.pathLesson.count({ where: { pathId: cataloguePathId } });

      await classRepository.updateClassPath(cataloguePathId, {
        title: "Détourné",
        description: "Ne doit pas passer",
        category: "DEV",
        difficulty: "EXPERT",
        estimatedHours: 99,
        lessonIds: [],
      });

      // Neither the fields nor the lessons: the guard covers both halves of the
      // transaction, or a stray id would empty a catalogue path's lesson list.
      const after = await prisma.path.findUnique({
        where: { id: cataloguePathId },
        select: { title: true },
      });
      expect(after?.title).toBe(`Catalogue ${suffix}`);
      expect(await prisma.pathLesson.count({ where: { pathId: cataloguePathId } })).toBe(before);
    });
  });

  describe("deleting", () => {
    it("refuses to delete a catalogue path, whatever id it is given", async () => {
      if (!configured) return;
      await classRepository.deleteClassPath(cataloguePathId);
      expect(await prisma.path.count({ where: { id: cataloguePathId } })).toBe(1);
    });

    it("leaves the lessons standing when the path goes", async () => {
      if (!configured) return;
      const doomed = await classRepository.createClassPath({
        classId,
        authorId: teacher,
        title: `Éphémère ${suffix}`,
        description: "Un parcours voué à disparaître",
        category: "CYBERSEC",
        difficulty: "BEGINNER",
        estimatedHours: 1,
        lessonIds: [lessonIds[0] ?? "", lessonIds[1] ?? ""],
      });
      await classRepository.deleteClassPath(doomed.id);

      expect(await prisma.path.count({ where: { id: doomed.id } })).toBe(0);
      // The material outlives the ordering over it, with its progress.
      expect(await prisma.lesson.count({ where: { id: { in: lessonIds } } })).toBe(3);
    });
  });
});
