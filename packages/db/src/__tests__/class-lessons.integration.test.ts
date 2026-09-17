/**
 * A lesson written for one class, and everywhere it must not turn up.
 *
 * This is the leak test. A CLASS lesson is PUBLISHED - the class has to be able
 * to open it - so every read that used to mean "published" and now means "in
 * the catalogue" is a place it could escape through: the lesson list, the
 * lookup by slug, the category counts beside the list, the platform's own
 * figures. They all read one rule, and this is what holds them to it.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { classRepository } from "../repositories/class.repository.js";
import { CATALOGUE_LESSON, lessonRepository } from "../repositories/lesson.repository.js";

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

let catalogueLessonId = "";
let classLessonId = "";
let classLessonSlug = "";

let configured = false;

describe("class lessons (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;

    await prisma.user.createMany({
      data: [
        {
          id: teacher,
          email: `t-${suffix}@t.internal`,
          username: `t${suffix}`,
          displayName: "Prof",
          role: "TEACHER",
        },
        {
          id: coTeacher,
          email: `c-${suffix}@t.internal`,
          username: `c${suffix}`,
          displayName: "Co",
          role: "TEACHER",
        },
        {
          id: otherTeacher,
          email: `o-${suffix}@t.internal`,
          username: `o${suffix}`,
          displayName: "Autre",
          role: "TEACHER",
        },
        {
          id: student,
          email: `s-${suffix}@t.internal`,
          username: `s${suffix}`,
          displayName: "Élève",
        },
        {
          id: outsider,
          email: `x-${suffix}@t.internal`,
          username: `x${suffix}`,
          displayName: "Dehors",
        },
        {
          id: admin,
          email: `a-${suffix}@t.internal`,
          username: `a${suffix}`,
          displayName: "Admin",
          role: "ADMIN",
        },
      ],
    });

    await prisma.establishment.create({
      data: { id: establishmentId, name: `Lycée ${suffix}`, slug: `lycee-${suffix}` },
    });
    await prisma.promotion.create({
      data: { id: promotionId, establishmentId, name: `BTS ${suffix}`, slug: `bts-${suffix}` },
    });
    await prisma.class.createMany({
      data: [
        { id: classId, promotionId, name: `SIO1-${suffix}`, slug: `sio1-${suffix}` },
        { id: otherClassId, promotionId, name: `SIO2-${suffix}`, slug: `sio2-${suffix}` },
      ],
    });
    await prisma.classTeacher.createMany({
      data: [
        { classId, teacherId: teacher },
        { classId, teacherId: coTeacher },
        { classId: otherClassId, teacherId: otherTeacher },
      ],
    });
    await prisma.classMember.create({ data: { classId, userId: student } });

    const catalogue = await prisma.lesson.create({
      data: {
        refCode: `CL-LSN-${suffix.slice(0, 3)}-V01`,
        slug: `catalogue-${suffix}`,
        title: `Catalogue ${suffix}`,
        description: "Une leçon du catalogue",
        category: "CYBERSEC",
        difficulty: "BEGINNER",
        estimatedMinutes: 10,
        xpReward: 10,
        contentMdx: "# catalogue",
        status: "PUBLISHED",
        publishedAt: new Date(),
        authorId: admin,
      },
      select: { id: true },
    });
    catalogueLessonId = catalogue.id;

    const written = await classRepository.createClassLesson({
      classId,
      authorId: teacher,
      title: `Révisions ${suffix}`,
      description: "Écrite pour la classe",
      category: "CYBERSEC",
      difficulty: "BEGINNER",
      estimatedMinutes: 15,
      xpReward: 20,
      contentMdx: "# révisions",
    });
    classLessonId = written.id;
    classLessonSlug = written.slug;

    configured = true;
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.lesson.deleteMany({ where: { id: { in: [catalogueLessonId, classLessonId] } } });
    await prisma.establishment.deleteMany({ where: { id: establishmentId } });
    await prisma.user.deleteMany({ where: { id: { in: USER_IDS } } });
  });

  async function slugsFor(userId: string): Promise<string[]> {
    const { lessons } = await lessonRepository.findManyWithProgress(userId, { paginate: false });
    return lessons.map((l) => l.slug);
  }

  describe("it is published, and still not the catalogue's", () => {
    it("is published, which is exactly why 'published' stopped being the rule", async () => {
      if (!configured) return;
      const row = await prisma.lesson.findUniqueOrThrow({
        where: { id: classLessonId },
        select: { status: true, audience: true },
      });
      expect(row.status).toBe("PUBLISHED");
      expect(row.audience).toBe("CLASS");
    });

    it("is absent from the lesson list of someone outside the class", async () => {
      if (!configured) return;
      const slugs = await slugsFor(outsider);
      expect(slugs).toContain(`catalogue-${suffix}`);
      expect(slugs).not.toContain(classLessonSlug);
    });

    it("is absent from the list of a teacher of another class", async () => {
      if (!configured) return;
      // The role is right and the class is not, which is the whole point.
      expect(await slugsFor(otherTeacher)).not.toContain(classLessonSlug);
    });

    it("is in the list of the class's student and of its teachers", async () => {
      if (!configured) return;
      for (const id of [student, teacher, coTeacher]) {
        expect(await slugsFor(id)).toContain(classLessonSlug);
      }
    });

    it("cannot be opened by slug from outside the class", async () => {
      if (!configured) return;
      // The failure this guards against: a slug is short, guessable and shared
      // in a chat, and "published" alone would have served it to anyone.
      expect(await lessonRepository.findBySlug(classLessonSlug, outsider)).toBeNull();
      expect(await lessonRepository.findBySlug(classLessonSlug, student)).not.toBeNull();
    });

    it("counts the same way the list shows: badges and rows agree", async () => {
      if (!configured) return;
      // A badge saying 40 over a list of 41 is the kind of wrongness nobody
      // reports and everybody notices.
      const forStudent = await lessonRepository.countByCategory(student);
      const forOutsider = await lessonRepository.countByCategory(outsider);
      expect((forStudent["CYBERSEC"] ?? 0) - (forOutsider["CYBERSEC"] ?? 0)).toBe(1);
    });

    it("is excluded from the platform's own figures", async () => {
      if (!configured) return;
      const inCatalogue = await prisma.lesson.count({
        where: { ...CATALOGUE_LESSON, id: { in: [catalogueLessonId, classLessonId] } },
      });
      expect(inCatalogue).toBe(1);
    });
  });

  describe("who may change it", () => {
    it("its author may", async () => {
      if (!configured) return;
      expect(await classRepository.canEditClassLesson(teacher, classLessonId)).toBe(true);
    });

    it("a co-teacher of the same class may", async () => {
      if (!configured) return;
      // They share the class, so they share the material - and a teacher who
      // leaves should not take the term with them.
      expect(await classRepository.canEditClassLesson(coTeacher, classLessonId)).toBe(true);
    });

    it("a teacher of another class may not, and neither may a student", async () => {
      if (!configured) return;
      expect(await classRepository.canEditClassLesson(otherTeacher, classLessonId)).toBe(false);
      expect(await classRepository.canEditClassLesson(student, classLessonId)).toBe(false);
    });

    it("an admin may", async () => {
      if (!configured) return;
      expect(await classRepository.canEditClassLesson(admin, classLessonId)).toBe(true);
    });

    it("nobody may reach a catalogue lesson through this door", async () => {
      if (!configured) return;
      // canEditClassLesson filters on audience, so a catalogue lesson is not
      // editable here even by an account that teaches everything.
      expect(await classRepository.canEditClassLesson(teacher, catalogueLessonId)).toBe(false);
    });
  });

  describe("deleting", () => {
    it("refuses to delete a catalogue lesson, whatever id it is given", async () => {
      if (!configured) return;
      await classRepository.deleteClassLesson(catalogueLessonId);

      // A stray id must not be able to take a catalogue lesson with it, which
      // is why the delete carries the audience in its where clause rather than
      // trusting the caller to have checked.
      expect(await prisma.lesson.count({ where: { id: catalogueLessonId } })).toBe(1);
    });
  });
});
