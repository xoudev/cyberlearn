/**
 * The byline on a lesson, and what erasing its author does to the lesson.
 *
 * Two things are being held here. The first is that findAuthor returns enough
 * to draw the byline in one round-trip: the name, the role that earns a label,
 * and the privacy flag that decides whether the name is shown at all. The
 * second is the foreign key added with it: erasing an account must leave every
 * lesson that account wrote standing, because other people are part-way
 * through them. Before the key existed the column simply kept pointing at a
 * row that was gone; ON DELETE SET NULL is what turns that into an honest
 * "the account is gone" instead of a dangling id.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { lessonRepository } from "../repositories/lesson.repository.js";

const suffix = randomUUID().slice(0, 8);

const teacher = randomUUID();
const doomed = randomUUID();
const USER_IDS = [teacher, doomed];

let teacherLessonId = "";
let doomedLessonId = "";

let configured = false;

async function makeLesson(authorId: string, tag: string): Promise<string> {
  const lesson = await prisma.lesson.create({
    data: {
      refCode: `AUT-${tag}-${suffix.slice(0, 3)}-V01`,
      slug: `auteur-${tag}-${suffix}`,
      title: `Auteur ${tag} ${suffix}`,
      description: "Une leçon avec un auteur",
      category: "CYBERSEC",
      difficulty: "BEGINNER",
      estimatedMinutes: 10,
      xpReward: 10,
      contentMdx: "# auteur",
      status: "PUBLISHED",
      publishedAt: new Date(),
      authorId,
    },
    select: { id: true },
  });
  return lesson.id;
}

describe("lesson author (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;

    await prisma.user.createMany({
      data: [
        {
          id: teacher,
          email: `prof-${suffix}@t.internal`,
          username: `prof${suffix}`,
          displayName: "Professeur Auteur",
          role: "TEACHER",
        },
        {
          id: doomed,
          email: `parti-${suffix}@t.internal`,
          username: `parti${suffix}`,
          displayName: "Compte Bientôt Parti",
          role: "STUDENT",
        },
      ],
    });
    await prisma.userPreferences.create({ data: { userId: teacher, publicProfile: true } });

    teacherLessonId = await makeLesson(teacher, "prof");
    doomedLessonId = await makeLesson(doomed, "parti");

    configured = true;
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.lesson.deleteMany({ where: { id: { in: [teacherLessonId, doomedLessonId] } } });
    await prisma.user.deleteMany({ where: { id: { in: USER_IDS } } });
  });

  describe("what the byline is drawn from", () => {
    it("returns the author, with the name, role and privacy flag the byline needs", async () => {
      if (!configured) return;
      const row = await lessonRepository.findAuthor(teacherLessonId);

      expect(row?.author?.id).toBe(teacher);
      expect(row?.author?.displayName).toBe("Professeur Auteur");
      expect(row?.author?.username).toBe(`prof${suffix}`);
      // The role earns the "Professeur" label, and the flag decides whether
      // the name is shown at all - both have to come back with the name or
      // the rail needs a second query to draw one line.
      expect(row?.author?.role).toBe("TEACHER");
      expect(row?.author?.preferences?.publicProfile).toBe(true);
    });

    it("returns the date the byline shows, published or failing that created", async () => {
      if (!configured) return;
      const row = await lessonRepository.findAuthor(teacherLessonId);

      expect(row?.publishedAt).toBeInstanceOf(Date);
      expect(row?.createdAt).toBeInstanceOf(Date);
    });

    it("returns null for a lesson that does not exist, rather than throwing", async () => {
      if (!configured) return;
      expect(await lessonRepository.findAuthor(randomUUID())).toBeNull();
    });
  });

  describe("when the author's account is erased", () => {
    it("keeps the lesson and drops only the credit", async () => {
      if (!configured) return;
      await prisma.user.delete({ where: { id: doomed } });

      // The lesson is still there: someone else may be part-way through it.
      expect(await prisma.lesson.count({ where: { id: doomedLessonId } })).toBe(1);

      // The column itself, not just the relation. A join against a deleted row
      // returns null either way, so reading author alone would pass just as
      // happily with the old dangling id still sitting in the column - which
      // is the thing the foreign key exists to prevent.
      const stored = await prisma.lesson.findUnique({
        where: { id: doomedLessonId },
        select: { authorId: true },
      });
      expect(stored?.authorId).toBeNull();

      // And the byline now has nothing to name, which is what the rail says
      // out loud instead of pointing at an account that no longer exists.
      const row = await lessonRepository.findAuthor(doomedLessonId);
      expect(row).not.toBeNull();
      expect(row?.author).toBeNull();
    });
  });
});
