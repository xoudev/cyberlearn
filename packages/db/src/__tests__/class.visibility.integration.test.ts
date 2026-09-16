/**
 * What counts as a live class, and who may read one - against the real DB.
 *
 * Three levels can retire a class: its own archivedAt, its intake's, and its
 * school's. Every read that answers "is this class still running" has to agree,
 * and they did not: findMembersVisibleTo checked only the class's own flag, so
 * it still served the roster of a class whose whole intake had been put away,
 * and nothing checked the school at all. LIVE_CLASS_FILTER is now that rule in
 * one place, and this is the test that it reaches all three reads.
 *
 * The entitlement check is here for the same reason. Prisma connects as the
 * table owner and bypasses RLS, so the policies are a second line of defence
 * over the Data API - the scoping in the where clause is what actually keeps a
 * stranger out of a roster, and it is worth a test that says so.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { classRepository } from "../repositories/class.repository.js";

const suffix = randomUUID().slice(0, 8);

const establishmentId = randomUUID();
const promotionId = randomUUID();
const classId = randomUUID();

const student = {
  id: randomUUID(),
  email: `cls-student-${suffix}@test.cyberlearn.internal`,
  username: `clsstu${suffix}`,
};
const teacher = {
  id: randomUUID(),
  email: `cls-teacher-${suffix}@test.cyberlearn.internal`,
  username: `clstea${suffix}`,
};
// In no class at all: the roster read must refuse them on scoping alone.
const stranger = {
  id: randomUUID(),
  email: `cls-stranger-${suffix}@test.cyberlearn.internal`,
  username: `clsout${suffix}`,
};
const USER_IDS = [student.id, teacher.id, stranger.id];

let configured = false;

/** Put every level back to live, so each case starts from the same place. */
async function resetArchiveFlags(): Promise<void> {
  await prisma.establishment.update({
    where: { id: establishmentId },
    data: { archivedAt: null },
  });
  await prisma.promotion.update({ where: { id: promotionId }, data: { archivedAt: null } });
  await prisma.class.update({ where: { id: classId }, data: { archivedAt: null } });
}

describe("classRepository visibility (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;

    await prisma.user.createMany({
      data: [
        { id: student.id, email: student.email, username: student.username, displayName: "Élève" },
        {
          id: teacher.id,
          email: teacher.email,
          username: teacher.username,
          displayName: "Prof",
          role: "TEACHER",
        },
        {
          id: stranger.id,
          email: stranger.email,
          username: stranger.username,
          displayName: "Inconnu",
        },
      ],
    });

    await prisma.establishment.create({
      data: { id: establishmentId, name: `Lycée ${suffix}`, slug: `lycee-${suffix}` },
    });
    await prisma.promotion.create({
      data: {
        id: promotionId,
        establishmentId,
        name: `BTS ${suffix}`,
        slug: `bts-${suffix}`,
        startYear: 2025,
      },
    });
    await prisma.class.create({
      data: { id: classId, promotionId, name: `SIO1-${suffix}`, slug: `sio1-${suffix}` },
    });
    await prisma.classMember.create({ data: { classId, userId: student.id } });
    await prisma.classTeacher.create({ data: { classId, teacherId: teacher.id } });

    configured = true;
  });

  afterAll(async () => {
    if (!configured) return;
    // The class tree cascades from the establishment; memberships cascade from
    // the class, so the users go last and take nothing with them.
    await prisma.establishment.deleteMany({ where: { id: establishmentId } });
    await prisma.user.deleteMany({ where: { id: { in: USER_IDS } } });
  });

  it("a live class is visible to its member, its teacher, and no one else", async () => {
    if (!configured) return;
    await resetArchiveFlags();

    const asMember = await classRepository.findForMember(student.id);
    expect(asMember.map((c) => c.id)).toContain(classId);

    const asTeacher = await classRepository.findForTeacher(teacher.id);
    expect(asTeacher.flatMap((e) => e.promotions).flatMap((p) => p.classes)).toContainEqual(
      expect.objectContaining({ id: classId }),
    );

    // Both sides of the entitlement check, on the same live class: the member
    // gets the roster, someone who merely knows the id gets nothing.
    expect(await classRepository.findMembersVisibleTo(classId, student.id)).not.toBeNull();
    expect(await classRepository.findMembersVisibleTo(classId, stranger.id)).toBeNull();
  });

  it("archiving the class hides it from all three reads", async () => {
    if (!configured) return;
    await resetArchiveFlags();
    await prisma.class.update({ where: { id: classId }, data: { archivedAt: new Date() } });

    expect((await classRepository.findForMember(student.id)).map((c) => c.id)).not.toContain(
      classId,
    );
    expect(await classRepository.findForTeacher(teacher.id)).toEqual([]);
    expect(await classRepository.findMembersVisibleTo(classId, student.id)).toBeNull();
  });

  it("archiving the promotion hides the class it holds", async () => {
    if (!configured) return;
    await resetArchiveFlags();
    await prisma.promotion.update({ where: { id: promotionId }, data: { archivedAt: new Date() } });

    expect((await classRepository.findForMember(student.id)).map((c) => c.id)).not.toContain(
      classId,
    );
    expect(await classRepository.findForTeacher(teacher.id)).toEqual([]);
    // The read this one used to pass: the class's own flag was still null, and
    // that was the only flag findMembersVisibleTo looked at.
    expect(await classRepository.findMembersVisibleTo(classId, student.id)).toBeNull();
  });

  it("archiving the establishment hides the classes beneath it", async () => {
    if (!configured) return;
    await resetArchiveFlags();
    await prisma.establishment.update({
      where: { id: establishmentId },
      data: { archivedAt: new Date() },
    });

    // Nothing was written to the promotion or the class - the reach is entirely
    // LIVE_CLASS_FILTER reading a flag two levels up.
    const klass = await prisma.class.findUniqueOrThrow({
      where: { id: classId },
      select: { archivedAt: true, promotion: { select: { archivedAt: true } } },
    });
    expect(klass.archivedAt).toBeNull();
    expect(klass.promotion.archivedAt).toBeNull();

    expect((await classRepository.findForMember(student.id)).map((c) => c.id)).not.toContain(
      classId,
    );
    expect(await classRepository.findForTeacher(teacher.id)).toEqual([]);
    expect(await classRepository.findMembersVisibleTo(classId, student.id)).toBeNull();
  });

  it("un-archiving the establishment brings back exactly what was live under it", async () => {
    if (!configured) return;
    await resetArchiveFlags();

    // One promotion put away on its own, then the whole school on top of it.
    await prisma.promotion.update({ where: { id: promotionId }, data: { archivedAt: new Date() } });
    await prisma.establishment.update({
      where: { id: establishmentId },
      data: { archivedAt: new Date() },
    });
    await prisma.establishment.update({
      where: { id: establishmentId },
      data: { archivedAt: null },
    });

    // The intake stays away: restoring the school must not resurrect what was
    // already retired before it. A cascade of writes could not tell them apart.
    expect((await classRepository.findForMember(student.id)).map((c) => c.id)).not.toContain(
      classId,
    );

    await prisma.promotion.update({ where: { id: promotionId }, data: { archivedAt: null } });
    expect((await classRepository.findForMember(student.id)).map((c) => c.id)).toContain(classId);
  });
});
