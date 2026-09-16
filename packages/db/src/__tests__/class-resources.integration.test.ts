/**
 * Corrigés, and when a class may read one - against the real DB.
 *
 * The whole point of an answer key is that it appears once it can no longer do
 * harm, so the interesting cases are all the ones where it must NOT appear: too
 * early, or before the student has done the thing it corrects. A teacher sees
 * everything either way - a corrigé they cannot re-read before handing it out
 * is a corrigé they cannot check - so the two reads are two methods, and the
 * test holds each to its own rule.
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
const lessonId = randomUUID();

const teacher = randomUUID();
const student = randomUUID();
const USER_IDS = [teacher, student];

const HOUR = 3_600_000;
let assignmentId = "";
let configured = false;

async function titlesForStudent(): Promise<string[]> {
  const rows = await classRepository.listResourcesForStudent(student, [classId]);
  return rows.map((r) => r.title);
}

describe("class resources (integration, real DB)", () => {
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
          id: student,
          email: `s-${suffix}@t.internal`,
          username: `s${suffix}`,
          displayName: "Élève",
        },
      ],
    });
    await prisma.establishment.create({
      data: { id: establishmentId, name: `Lycée ${suffix}`, slug: `lycee-${suffix}` },
    });
    await prisma.promotion.create({
      data: { id: promotionId, establishmentId, name: `BTS ${suffix}`, slug: `bts-${suffix}` },
    });
    await prisma.class.create({
      data: { id: classId, promotionId, name: `SIO1-${suffix}`, slug: `sio1-${suffix}` },
    });
    await prisma.classTeacher.create({ data: { classId, teacherId: teacher } });
    await prisma.classMember.create({ data: { classId, userId: student } });

    await prisma.lesson.create({
      data: {
        id: lessonId,
        refCode: `CL-RES-${suffix.slice(0, 3)}-V01`,
        slug: `res-${suffix}`,
        title: `TP ${suffix}`,
        description: "Fixture",
        category: "CYBERSEC",
        difficulty: "BEGINNER",
        estimatedMinutes: 10,
        xpReward: 10,
        contentMdx: "# tp",
        status: "PUBLISHED",
        authorId: teacher,
      },
    });
    const assignment = await prisma.classAssignment.create({
      data: { classId, lessonId, assignedById: teacher },
      select: { id: true },
    });
    assignmentId = assignment.id;

    configured = true;
  });

  afterEach(async () => {
    if (!configured) return;
    await prisma.classResource.deleteMany({ where: { classId } });
    await prisma.userLessonProgress.deleteMany({ where: { userId: student } });
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.establishment.deleteMany({ where: { id: establishmentId } });
    await prisma.lesson.deleteMany({ where: { id: lessonId } });
    await prisma.user.deleteMany({ where: { id: { in: USER_IDS } } });
  });

  it("a resource with no conditions is readable at once", async () => {
    if (!configured) return;
    await classRepository.createResource({
      classId,
      assignmentId: null,
      title: "Polycopié",
      body: "Le cours",
      url: null,
      releasedAt: null,
      afterCompletion: false,
      createdById: teacher,
    });
    expect(await titlesForStudent()).toEqual(["Polycopié"]);
  });

  it("a dated resource is withheld until that date, and appears after it", async () => {
    if (!configured) return;
    await classRepository.createResource({
      classId,
      assignmentId: null,
      title: "Corrigé futur",
      body: "La réponse",
      url: null,
      releasedAt: new Date(Date.now() + HOUR),
      afterCompletion: false,
      createdById: teacher,
    });
    expect(await titlesForStudent()).toEqual([]);

    await prisma.classResource.updateMany({
      where: { classId },
      data: { releasedAt: new Date(Date.now() - HOUR) },
    });
    expect(await titlesForStudent()).toEqual(["Corrigé futur"]);
  });

  it("an after-completion resource is withheld until the lesson is finished", async () => {
    if (!configured) return;
    await classRepository.createResource({
      classId,
      assignmentId,
      title: "Corrigé du TP",
      body: "La réponse",
      url: null,
      releasedAt: null,
      afterCompletion: true,
      createdById: teacher,
    });

    // Started is not finished: handing the answer to somebody halfway through
    // is the same as handing it to them at the start.
    await prisma.userLessonProgress.create({
      data: { userId: student, lessonId, status: "IN_PROGRESS" },
    });
    expect(await titlesForStudent()).toEqual([]);

    await prisma.userLessonProgress.update({
      where: { userId_lessonId: { userId: student, lessonId } },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    expect(await titlesForStudent()).toEqual(["Corrigé du TP"]);
  });

  it("both conditions are applied, not either", async () => {
    if (!configured) return;
    await classRepository.createResource({
      classId,
      assignmentId,
      title: "Corrigé verrouillé deux fois",
      body: "La réponse",
      url: null,
      releasedAt: new Date(Date.now() + HOUR),
      afterCompletion: true,
      createdById: teacher,
    });

    // Finished, but the date has not come: a rule that passed on either would
    // hand it over here, which is the case a teacher setting both is guarding
    // against.
    await prisma.userLessonProgress.create({
      data: { userId: student, lessonId, status: "COMPLETED", completedAt: new Date() },
    });
    expect(await titlesForStudent()).toEqual([]);
  });

  it("the teacher sees what is still withheld, and what it is waiting on", async () => {
    if (!configured) return;
    await classRepository.createResource({
      classId,
      assignmentId,
      title: "Corrigé préparé",
      body: "La réponse",
      url: null,
      releasedAt: new Date(Date.now() + HOUR),
      afterCompletion: true,
      createdById: teacher,
    });

    const rows = await classRepository.listResourcesForTeacher([classId]);
    expect(rows.map((r) => r.title)).toEqual(["Corrigé préparé"]);
    expect(rows[0]?.releasedAt).not.toBeNull();
    expect(rows[0]?.afterCompletion).toBe(true);
    expect(rows[0]?.assignment?.lesson.title).toBe(`TP ${suffix}`);
  });

  it("does not leak the withholding rule to the student payload", async () => {
    if (!configured) return;
    await classRepository.createResource({
      classId,
      assignmentId: null,
      title: "Polycopié",
      body: "Le cours",
      url: null,
      releasedAt: null,
      afterCompletion: false,
      createdById: teacher,
    });
    const [row] = await classRepository.listResourcesForStudent(student, [classId]);
    // The student side has already applied it; sending it on invites a caller
    // to apply it a second time, or to render it.
    expect(row).not.toHaveProperty("afterCompletion");
    expect(row).not.toHaveProperty("releasedAt");
  });

  it("keeps the corrigé when the work it went with is taken down", async () => {
    if (!configured) return;
    await classRepository.createResource({
      classId,
      assignmentId,
      title: "Corrigé orphelin",
      body: "La réponse",
      url: null,
      releasedAt: null,
      afterCompletion: false,
      createdById: teacher,
    });
    await prisma.classAssignment.delete({ where: { id: assignmentId } });

    // A corrigé is still a corrigé once the assignment is gone, so the link is
    // SET NULL rather than CASCADE. Re-created afterwards for the next case.
    const rows = await classRepository.listResourcesForTeacher([classId]);
    expect(rows.map((r) => r.title)).toEqual(["Corrigé orphelin"]);
    expect(rows[0]?.assignmentId).toBeNull();

    const again = await prisma.classAssignment.create({
      data: { classId, lessonId, assignedById: teacher },
      select: { id: true },
    });
    assignmentId = again.id;
  });
});
