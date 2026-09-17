/**
 * Setting work for a class - against the real DB.
 *
 * The rule that matters most here is the authorisation one. The web app has no
 * admin gate: a teacher is an ordinary signed-in user, so canSetWorkFor is the
 * whole of it, and it must answer on the class tables rather than on a role. A
 * teacher of one class must not be able to set work for another by knowing its
 * id, and a student must not be able to set any.
 *
 * The rest is about not lying to a class: re-assigning moves a deadline instead
 * of showing the same lesson twice under two dates, and completion is read from
 * the progress a student already has rather than stored a second time.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { classRepository } from "../repositories/class.repository.js";

const suffix = randomUUID().slice(0, 8);

const establishmentId = randomUUID();
const promotionId = randomUUID();
const classId = randomUUID();
const otherClassId = randomUUID();
const lessonA = randomUUID();
const lessonB = randomUUID();

const teacher = randomUUID();
const otherTeacher = randomUUID();
const admin = randomUUID();
const student = randomUUID();
const classmate = randomUUID();

const USER_IDS = [teacher, otherTeacher, admin, student, classmate];
const HOUR = 3_600_000;

let configured = false;

async function makeLesson(id: string, title: string): Promise<void> {
  await prisma.lesson.create({
    data: {
      id,
      refCode: `CL-TST-${id.slice(0, 8)}-V01`,
      slug: `test-${id.slice(0, 8)}`,
      title,
      description: "Fixture",
      category: "CYBERSEC",
      difficulty: "BEGINNER",
      estimatedMinutes: 10,
      xpReward: 10,
      contentMdx: "# test",
      status: "PUBLISHED",
      authorId: admin,
    },
  });
}

describe("class assignments (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;

    await prisma.user.createMany({
      data: [
        {
          id: teacher,
          email: `t-${suffix}@test.cyberlearn.internal`,
          username: `t${suffix}`,
          displayName: "Prof",
          role: "TEACHER",
        },
        {
          id: otherTeacher,
          email: `t2-${suffix}@test.cyberlearn.internal`,
          username: `t2${suffix}`,
          displayName: "Autre prof",
          role: "TEACHER",
        },
        {
          id: admin,
          email: `a-${suffix}@test.cyberlearn.internal`,
          username: `a${suffix}`,
          displayName: "Admin",
          role: "ADMIN",
        },
        {
          id: student,
          email: `s-${suffix}@test.cyberlearn.internal`,
          username: `s${suffix}`,
          displayName: "Élève",
        },
        {
          id: classmate,
          email: `s2-${suffix}@test.cyberlearn.internal`,
          username: `s2${suffix}`,
          displayName: "Camarade",
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
    await prisma.classTeacher.create({ data: { classId, teacherId: teacher } });
    await prisma.classTeacher.create({ data: { classId: otherClassId, teacherId: otherTeacher } });
    await prisma.classMember.createMany({
      data: [
        { classId, userId: student },
        { classId, userId: classmate },
      ],
    });

    await makeLesson(lessonA, "Injections SQL");
    await makeLesson(lessonB, "Modèle OSI");

    configured = true;
  });

  afterEach(async () => {
    if (!configured) return;
    await prisma.classAssignment.deleteMany({
      where: { classId: { in: [classId, otherClassId] } },
    });
    await prisma.userLessonProgress.deleteMany({ where: { userId: { in: USER_IDS } } });
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.establishment.deleteMany({ where: { id: establishmentId } });
    await prisma.lesson.deleteMany({ where: { id: { in: [lessonA, lessonB] } } });
    await prisma.user.deleteMany({ where: { id: { in: USER_IDS } } });
  });

  describe("who may set work", () => {
    it("the teacher of the class may", async () => {
      if (!configured) return;
      expect(await classRepository.canSetWorkFor(teacher, classId)).toBe(true);
    });

    it("a teacher of another class may not", async () => {
      if (!configured) return;
      // The role is right and the class is not. Checking the role would have
      // let them set work for a class they have nothing to do with.
      expect(await classRepository.canSetWorkFor(otherTeacher, classId)).toBe(false);
    });

    it("a student in the class may not", async () => {
      if (!configured) return;
      expect(await classRepository.canSetWorkFor(student, classId)).toBe(false);
    });

    it("an admin may, anywhere", async () => {
      if (!configured) return;
      // The console and the site are the same product to whoever is using them.
      expect(await classRepository.canSetWorkFor(admin, classId)).toBe(true);
      expect(await classRepository.canSetWorkFor(admin, otherClassId)).toBe(true);
    });
  });

  describe("setting it", () => {
    it("reports the first one as new and carries the deadline", async () => {
      if (!configured) return;
      const dueAt = new Date(Date.now() + 48 * HOUR);
      const { created } = await classRepository.assignLesson({
        classId,
        lessonId: lessonA,
        assignedById: teacher,
        dueAt,
        instructions: "Exercices 1 à 4.",
      });

      expect(created).toBe(true);
      const [row] = await classRepository.listAssignments([classId]);
      expect(row?.lessonId).toBe(lessonA);
      expect(row?.dueAt?.getTime()).toBe(dueAt.getTime());
      expect(row?.instructions).toBe("Exercices 1 à 4.");
    });

    it("re-assigning moves the date instead of setting it twice", async () => {
      if (!configured) return;
      const first = new Date(Date.now() + 24 * HOUR);
      const second = new Date(Date.now() + 96 * HOUR);

      await classRepository.assignLesson({
        classId,
        lessonId: lessonA,
        assignedById: teacher,
        dueAt: first,
        instructions: null,
      });
      const { created } = await classRepository.assignLesson({
        classId,
        lessonId: lessonA,
        assignedById: teacher,
        dueAt: second,
        instructions: null,
      });

      // Two rows would show the class the same lesson under two deadlines, and
      // `created` staying false is what keeps the caller from ringing every
      // bell in the class because a date moved by a day.
      expect(created).toBe(false);
      const rows = await classRepository.listAssignments([classId]);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.dueAt?.getTime()).toBe(second.getTime());
    });

    it("orders by deadline, with the undated last", async () => {
      if (!configured) return;
      await classRepository.assignLesson({
        classId,
        lessonId: lessonB,
        assignedById: teacher,
        dueAt: null,
        instructions: null,
      });
      await classRepository.assignLesson({
        classId,
        lessonId: lessonA,
        assignedById: teacher,
        dueAt: new Date(Date.now() + HOUR),
        instructions: null,
      });

      // Work with no deadline is neither urgent nor overdue, so it belongs
      // under the work that is one or the other.
      const rows = await classRepository.listAssignments([classId]);
      expect(rows.map((r) => r.lessonId)).toEqual([lessonA, lessonB]);
    });

    it("unassigning removes it", async () => {
      if (!configured) return;
      await classRepository.assignLesson({
        classId,
        lessonId: lessonA,
        assignedById: teacher,
        dueAt: null,
        instructions: null,
      });
      await classRepository.unassignLesson(classId, lessonA);
      expect(await classRepository.listAssignments([classId])).toEqual([]);
    });

    it("keeps the work when the teacher's account is deleted", async () => {
      if (!configured) return;
      const temp = randomUUID();
      await prisma.user.create({
        data: {
          id: temp,
          email: `tmp-${temp.slice(0, 8)}@test.cyberlearn.internal`,
          username: `tmp${temp.slice(0, 8)}`,
          displayName: "Temporaire",
          role: "TEACHER",
        },
      });
      await classRepository.assignLesson({
        classId,
        lessonId: lessonA,
        assignedById: temp,
        dueAt: null,
        instructions: null,
      });
      await prisma.user.delete({ where: { id: temp } });

      // A class does not stop having work because the person who set it left.
      const rows = await classRepository.listAssignments([classId]);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.assignedBy).toBeNull();
    });
  });

  describe("who has done it", () => {
    it("reads completion from the progress a student already has", async () => {
      if (!configured) return;
      await prisma.userLessonProgress.create({
        data: { userId: student, lessonId: lessonA, status: "COMPLETED", completedAt: new Date() },
      });
      await prisma.userLessonProgress.create({
        data: { userId: classmate, lessonId: lessonA, status: "IN_PROGRESS" },
      });

      const done = await classRepository.findCompletions([student, classmate], [lessonA, lessonB]);

      expect(done.has(`${student}:${lessonA}`)).toBe(true);
      // Started is not finished.
      expect(done.has(`${classmate}:${lessonA}`)).toBe(false);
      expect(done.has(`${student}:${lessonB}`)).toBe(false);
    });

    it("counts a lesson finished before it was ever assigned", async () => {
      if (!configured) return;
      await prisma.userLessonProgress.create({
        data: { userId: student, lessonId: lessonA, status: "COMPLETED", completedAt: new Date() },
      });
      await classRepository.assignLesson({
        classId,
        lessonId: lessonA,
        assignedById: teacher,
        dueAt: null,
        instructions: null,
      });

      // The honest answer, and the one that avoids telling somebody to do again
      // what they have already done. Storing completion on the assignment would
      // have said they had not.
      const done = await classRepository.findCompletions([student], [lessonA]);
      expect(done.has(`${student}:${lessonA}`)).toBe(true);
    });
  });
});
