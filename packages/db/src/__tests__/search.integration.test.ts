/**
 * What the navbar search may and may not find.
 *
 * The search reaches three tables at once, and two of them have a reader in
 * their rules: a CLASS lesson or path is PUBLISHED, and a note belongs to one
 * person. A search box is the easiest place in a site to leak both - it is one
 * text field that queries everything - so this is the leak test for it,
 * written the same way as the ones for class lessons and class paths.
 *
 * It also pins the two things that make the search usable rather than correct:
 * accents are folded (a French site where "securite" finds nothing is broken),
 * and LIKE's wildcards are data, not syntax.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { classRepository } from "../repositories/class.repository.js";
import { searchRepository } from "../repositories/search.repository.js";

const suffix = randomUUID().slice(0, 8);

const establishmentId = randomUUID();
const promotionId = randomUUID();
const classId = randomUUID();

const teacher = randomUUID();
const student = randomUUID();
const outsider = randomUUID();
const admin = randomUUID();
const USER_IDS = [teacher, student, outsider, admin];

/** Every title carries the suffix so one run cannot read another run's rows. */
const TERM = `parefeu${suffix}`;

let catalogueLessonId = "";
let draftLessonId = "";
let classLessonId = "";
let cataloguePathId = "";
let classPathId = "";
let studentNoteId = "";
let outsiderNoteId = "";

let configured = false;

async function makeLesson(
  title: string,
  status: "PUBLISHED" | "DRAFT",
  n: number,
): Promise<string> {
  const row = await prisma.lesson.create({
    data: {
      refCode: `SR-LSN-${suffix.slice(0, 3)}-V0${String(n)}`,
      slug: `recherche-lecon-${String(n)}-${suffix}`,
      title,
      description: "Une leçon du catalogue",
      category: "CYBERSEC",
      difficulty: "BEGINNER",
      estimatedMinutes: 10,
      xpReward: 10,
      contentMdx: "# leçon",
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
      authorId: admin,
    },
    select: { id: true },
  });
  return row.id;
}

describe("search (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;

    await prisma.user.createMany({
      data: [
        { id: teacher, email: `sr-t-${suffix}@t.internal`, displayName: "Prof", role: "TEACHER" },
        { id: student, email: `sr-s-${suffix}@t.internal`, displayName: "Élève", role: "STUDENT" },
        { id: outsider, email: `sr-o-${suffix}@t.internal`, displayName: "Autre", role: "STUDENT" },
        { id: admin, email: `sr-a-${suffix}@t.internal`, displayName: "Admin", role: "ADMIN" },
      ],
    });

    await prisma.establishment.create({
      data: {
        id: establishmentId,
        name: `Lycée ${suffix}`,
        slug: `lycee-recherche-${suffix}`,
        promotions: {
          create: {
            id: promotionId,
            name: `Promo ${suffix}`,
            slug: `promo-recherche-${suffix}`,
            classes: {
              create: [
                { id: classId, name: `Classe ${suffix}`, slug: `classe-recherche-${suffix}` },
              ],
            },
          },
        },
      },
    });
    await prisma.classTeacher.create({ data: { classId, teacherId: teacher } });
    await prisma.classMember.create({ data: { classId, userId: student } });

    // Accented on purpose: the search has to find it from an unaccented query.
    catalogueLessonId = await makeLesson(`Sécurité du ${TERM}`, "PUBLISHED", 1);
    draftLessonId = await makeLesson(`Brouillon du ${TERM}`, "DRAFT", 2);

    const classLesson = await classRepository.createClassLesson({
      classId,
      authorId: teacher,
      title: `Interne du ${TERM}`,
      description: "Écrite pour la classe",
      category: "CYBERSEC",
      difficulty: "BEGINNER",
      estimatedMinutes: 10,
      xpReward: 10,
      contentMdx: "# interne",
    });
    classLessonId = classLesson.id;

    const cataloguePath = await prisma.path.create({
      data: {
        refCode: `SR-PATH-${suffix.slice(0, 3)}-V01`,
        slug: `recherche-parcours-${suffix}`,
        title: `Parcours ${TERM}`,
        description: "Un parcours du catalogue",
        category: "CYBERSEC",
        difficulty: "BEGINNER",
        estimatedHours: 4,
        status: "PUBLISHED",
        publishedAt: new Date(),
        lessons: { create: [{ lessonId: catalogueLessonId, position: 1 }] },
      },
      select: { id: true },
    });
    cataloguePathId = cataloguePath.id;

    const classPath = await classRepository.createClassPath({
      classId,
      authorId: teacher,
      title: `Révisions ${TERM}`,
      description: "Construit pour la classe",
      category: "CYBERSEC",
      difficulty: "BEGINNER",
      estimatedHours: 3,
      lessonIds: [catalogueLessonId],
    });
    classPathId = classPath.id;

    const ownNote = await prisma.note.create({
      data: {
        userId: student,
        lessonId: catalogueLessonId,
        content: "Le chiffrement asymétrique repose sur une paire de clés.",
        wordCount: 10,
      },
      select: { id: true },
    });
    studentNoteId = ownNote.id;

    const otherNote = await prisma.note.create({
      data: {
        userId: outsider,
        lessonId: catalogueLessonId,
        content: "Mes propres remarques sur le chiffrement asymétrique.",
        wordCount: 8,
      },
      select: { id: true },
    });
    outsiderNoteId = otherNote.id;

    configured = true;
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.note.deleteMany({ where: { id: { in: [studentNoteId, outsiderNoteId] } } });
    await prisma.path.deleteMany({ where: { id: { in: [cataloguePathId, classPathId] } } });
    await prisma.lesson.deleteMany({
      where: { id: { in: [catalogueLessonId, draftLessonId, classLessonId] } },
    });
    await prisma.establishment.deleteMany({ where: { id: establishmentId } });
    await prisma.user.deleteMany({ where: { id: { in: USER_IDS } } });
  });

  describe("what a class's own work is, and is not, findable by", () => {
    it("gives the class its own lesson and its own parcours", async () => {
      if (!configured) return;
      const rows = await searchRepository.search(student, TERM);

      expect(rows.lessons.map((l) => l.id)).toContain(classLessonId);
      expect(rows.paths.map((p) => p.id)).toContain(classPathId);
    });

    it("gives the teacher the same, through teaching the class rather than being in it", async () => {
      if (!configured) return;
      const rows = await searchRepository.search(teacher, TERM);

      expect(rows.lessons.map((l) => l.id)).toContain(classLessonId);
      expect(rows.paths.map((p) => p.id)).toContain(classPathId);
    });

    it("hands an outsider the catalogue and nothing of the class's", async () => {
      if (!configured) return;
      const rows = await searchRepository.search(outsider, TERM);

      expect(rows.lessons.map((l) => l.id)).toContain(catalogueLessonId);
      expect(rows.paths.map((p) => p.id)).toContain(cataloguePathId);
      expect(rows.lessons.map((l) => l.id)).not.toContain(classLessonId);
      expect(rows.paths.map((p) => p.id)).not.toContain(classPathId);
    });

    it("never offers a draft, to anybody", async () => {
      if (!configured) return;
      for (const viewer of [student, teacher, outsider]) {
        const rows = await searchRepository.search(viewer, TERM);
        expect(rows.lessons.map((l) => l.id)).not.toContain(draftLessonId);
      }
    });
  });

  describe("notes belong to one person", () => {
    it("finds the reader's own note by what is written in it", async () => {
      if (!configured) return;
      const rows = await searchRepository.search(student, "asymétrique");
      expect(rows.notes.map((n) => n.id)).toEqual([studentNoteId]);
    });

    it("never returns somebody else's note, on the same lesson and the same words", async () => {
      if (!configured) return;
      const rows = await searchRepository.search(student, "asymétrique");
      expect(rows.notes.map((n) => n.id)).not.toContain(outsiderNoteId);

      const theirs = await searchRepository.search(outsider, "asymétrique");
      expect(theirs.notes.map((n) => n.id)).toEqual([outsiderNoteId]);
    });

    it("finds a note by the lesson it was taken on", async () => {
      if (!configured) return;
      const rows = await searchRepository.search(student, TERM);
      expect(rows.notes.map((n) => n.id)).toContain(studentNoteId);
    });
  });

  describe("the shape of the term", () => {
    it("finds an accented title from an unaccented query", async () => {
      if (!configured) return;
      // "Sécurité du <term>" typed as "securite" - the whole reason the fold
      // exists. Postgres' ILIKE would return nothing here.
      const rows = await searchRepository.search(student, `Securite du ${TERM}`);
      expect(rows.lessons.map((l) => l.id)).toContain(catalogueLessonId);
    });

    it("finds an accented note from an unaccented query", async () => {
      if (!configured) return;
      const rows = await searchRepository.search(student, "asymetrique");
      expect(rows.notes.map((n) => n.id)).toEqual([studentNoteId]);
    });

    it("treats LIKE's wildcards as characters somebody typed", async () => {
      if (!configured) return;
      const rows = await searchRepository.search(student, "%_%");
      expect(rows.lessons).toHaveLength(0);
      expect(rows.paths).toHaveLength(0);
      expect(rows.notes).toHaveLength(0);
    });

    it("asks the database nothing at all for a one-character term", async () => {
      if (!configured) return;
      const rows = await searchRepository.search(student, "a");
      expect(rows).toEqual({ paths: [], lessons: [], notes: [] });
    });
  });
});
