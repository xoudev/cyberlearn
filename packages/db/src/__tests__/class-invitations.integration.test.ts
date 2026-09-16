/**
 * Invitations, and what redeems one - against the real DB.
 *
 * The rule under test is that the address is the credential. There is no token
 * anywhere in this flow, deliberately: a token in a link is forwardable, and
 * whoever opened it would land in a stranger's class with their classmates'
 * names in front of them. Supabase has verified the address by the time
 * upsertFromAuth runs, so matching on it is both simpler and stricter.
 *
 * Which makes the negative cases the important ones. Signing up with a
 * different address must take nothing; an expired invitation must take nothing;
 * an invitation to a class that has since been put away must take nothing.
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

const adminId = randomUUID();
const INVITED_EMAIL = `invited-${suffix}@test.cyberlearn.internal`;
const OTHER_EMAIL = `other-${suffix}@test.cyberlearn.internal`;

const HOUR = 3_600_000;

let configured = false;
/** Accounts created per case, removed after it. */
let scratchUserIds: string[] = [];

async function makeUser(email: string): Promise<string> {
  const id = randomUUID();
  await prisma.user.create({
    data: { id, email, username: `u${id.slice(0, 8)}`, displayName: "Invité" },
  });
  scratchUserIds.push(id);
  return id;
}

describe("class invitations (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;

    await prisma.user.create({
      data: {
        id: adminId,
        email: `admin-${suffix}@test.cyberlearn.internal`,
        username: `adm${suffix}`,
        displayName: "Admin",
        role: "ADMIN",
      },
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

    configured = true;
  });

  afterEach(async () => {
    if (!configured) return;
    await prisma.classInvitation.deleteMany({
      where: { classId: { in: [classId, otherClassId] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: scratchUserIds } } });
    scratchUserIds = [];
    await prisma.class.updateMany({
      where: { id: { in: [classId, otherClassId] } },
      data: { archivedAt: null },
    });
    await prisma.promotion.update({ where: { id: promotionId }, data: { archivedAt: null } });
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.establishment.deleteMany({ where: { id: establishmentId } });
    await prisma.user.deleteMany({ where: { id: adminId } });
  });

  it("holds a place, then hands it over when that address signs in", async () => {
    if (!configured) return;
    const { created } = await classRepository.inviteToClass(
      classId,
      [INVITED_EMAIL],
      adminId,
      new Date(Date.now() + HOUR),
    );
    expect(created).toEqual([INVITED_EMAIL]);

    const userId = await makeUser(INVITED_EMAIL);
    const joined = await classRepository.redeemInvitationsForEmail(userId, INVITED_EMAIL);

    expect(joined).toEqual([classId]);
    expect(await prisma.classMember.count({ where: { classId, userId } })).toBe(1);
    // And the bell rings, because the person is looking at the product.
    expect(await prisma.notification.count({ where: { userId, type: "CLASS_ENROLLED" } })).toBe(1);
  });

  it("takes nothing for a different address", async () => {
    if (!configured) return;
    await classRepository.inviteToClass(
      classId,
      [INVITED_EMAIL],
      adminId,
      new Date(Date.now() + HOUR),
    );

    // The whole point of binding to the address rather than to a link: someone
    // who signs up with their own e-mail cannot walk into a class they were
    // never invited to, however they came by the invitation.
    const userId = await makeUser(OTHER_EMAIL);
    expect(await classRepository.redeemInvitationsForEmail(userId, OTHER_EMAIL)).toEqual([]);
    expect(await prisma.classMember.count({ where: { userId } })).toBe(0);
  });

  it("matches the address case-insensitively", async () => {
    if (!configured) return;
    await classRepository.inviteToClass(
      classId,
      [INVITED_EMAIL],
      adminId,
      new Date(Date.now() + HOUR),
    );

    const userId = await makeUser(`CASE-${suffix}@test.cyberlearn.internal`);
    // Supabase does not promise the casing the person typed comes back
    // unchanged, and an address is not case sensitive in the part that matters.
    const joined = await classRepository.redeemInvitationsForEmail(
      userId,
      `  ${INVITED_EMAIL.toUpperCase()}  `,
    );
    expect(joined).toEqual([classId]);
  });

  it("takes nothing once the invitation has lapsed", async () => {
    if (!configured) return;
    await classRepository.inviteToClass(
      classId,
      [INVITED_EMAIL],
      adminId,
      new Date(Date.now() - HOUR),
    );

    const userId = await makeUser(INVITED_EMAIL);
    expect(await classRepository.redeemInvitationsForEmail(userId, INVITED_EMAIL)).toEqual([]);

    // The row stays. An expiry is a fact about an invitation, and an
    // administrator should see that it lapsed rather than find no trace of
    // having sent it.
    expect(await prisma.classInvitation.count({ where: { classId } })).toBe(1);
  });

  it("takes nothing into a class that has been put away", async () => {
    if (!configured) return;
    await classRepository.inviteToClass(
      classId,
      [INVITED_EMAIL],
      adminId,
      new Date(Date.now() + HOUR),
    );
    await prisma.promotion.update({ where: { id: promotionId }, data: { archivedAt: new Date() } });

    const userId = await makeUser(INVITED_EMAIL);
    expect(await classRepository.redeemInvitationsForEmail(userId, INVITED_EMAIL)).toEqual([]);
    expect(await prisma.classMember.count({ where: { userId } })).toBe(0);
  });

  it("redeems every class the address was invited to, in one sign-in", async () => {
    if (!configured) return;
    const expiry = new Date(Date.now() + HOUR);
    await classRepository.inviteToClass(classId, [INVITED_EMAIL], adminId, expiry);
    await classRepository.inviteToClass(otherClassId, [INVITED_EMAIL], adminId, expiry);

    const userId = await makeUser(INVITED_EMAIL);
    const joined = await classRepository.redeemInvitationsForEmail(userId, INVITED_EMAIL);

    expect(joined).toHaveLength(2);
    expect(new Set(joined)).toEqual(new Set([classId, otherClassId]));
  });

  it("is idempotent: a second sign-in adds nothing and says nothing", async () => {
    if (!configured) return;
    await classRepository.inviteToClass(
      classId,
      [INVITED_EMAIL],
      adminId,
      new Date(Date.now() + HOUR),
    );

    const userId = await makeUser(INVITED_EMAIL);
    await classRepository.redeemInvitationsForEmail(userId, INVITED_EMAIL);
    // Every sign-in calls this. A second notification for the same class would
    // be the bell ringing every morning about something that happened once.
    // Two things stop it - the acceptedAt filter and the membership read - and
    // the case below is the one that separates them.
    const again = await classRepository.redeemInvitationsForEmail(userId, INVITED_EMAIL);

    expect(again).toEqual([]);
    expect(await prisma.classMember.count({ where: { classId, userId } })).toBe(1);
    expect(await prisma.notification.count({ where: { userId } })).toBe(1);
  });

  it("re-inviting renews instead of stacking a second row", async () => {
    if (!configured) return;
    const first = new Date(Date.now() + HOUR);
    const second = new Date(Date.now() + 48 * HOUR);

    const a = await classRepository.inviteToClass(classId, [INVITED_EMAIL], adminId, first);
    const b = await classRepository.inviteToClass(classId, [INVITED_EMAIL], adminId, second);

    // Re-pasting a roster is how the three missing students get added. The
    // seventeen already invited must not be mailed again for it, which is what
    // the created / renewed split is for.
    expect(a.created).toEqual([INVITED_EMAIL]);
    expect(b.created).toEqual([]);
    expect(b.renewed).toEqual([INVITED_EMAIL]);

    const rows = await prisma.classInvitation.findMany({ where: { classId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.expiresAt.getTime()).toBe(second.getTime());
  });

  it("does not put back someone an administrator took out of the class", async () => {
    if (!configured) return;
    await classRepository.inviteToClass(
      classId,
      [INVITED_EMAIL],
      adminId,
      new Date(Date.now() + HOUR),
    );
    const userId = await makeUser(INVITED_EMAIL);
    await classRepository.redeemInvitationsForEmail(userId, INVITED_EMAIL);
    await classRepository.removeMember(classId, userId);

    // This is what acceptedAt is for, and the membership read cannot cover it:
    // there is no membership any more. A spent invitation that stayed live
    // would undo the removal at the student's next sign-in, silently, and keep
    // doing it - the administrator would have to remove them every morning.
    expect(await classRepository.redeemInvitationsForEmail(userId, INVITED_EMAIL)).toEqual([]);
    expect(await prisma.classMember.count({ where: { classId, userId } })).toBe(0);
  });

  it("re-inviting someone who already accepted opens the place again", async () => {
    if (!configured) return;
    await classRepository.inviteToClass(
      classId,
      [INVITED_EMAIL],
      adminId,
      new Date(Date.now() + HOUR),
    );
    const userId = await makeUser(INVITED_EMAIL);
    await classRepository.redeemInvitationsForEmail(userId, INVITED_EMAIL);
    await classRepository.removeMember(classId, userId);

    // Removed from the class, then invited again: an administrator doing that
    // is saying the place is open, and a row stuck on "accepted" would silently
    // refuse them.
    await classRepository.inviteToClass(
      classId,
      [INVITED_EMAIL],
      adminId,
      new Date(Date.now() + HOUR),
    );
    expect(await classRepository.redeemInvitationsForEmail(userId, INVITED_EMAIL)).toEqual([
      classId,
    ]);
  });

  it("lists what is pending, and a revoked invitation takes nothing", async () => {
    if (!configured) return;
    await classRepository.inviteToClass(
      classId,
      [INVITED_EMAIL],
      adminId,
      new Date(Date.now() + HOUR),
    );

    const pending = await classRepository.listPendingInvitations(classId);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.email).toBe(INVITED_EMAIL);
    expect(pending[0]?.invitedBy?.displayName).toBe("Admin");

    await classRepository.revokeInvitation(pending[0]?.id ?? "");

    const userId = await makeUser(INVITED_EMAIL);
    expect(await classRepository.redeemInvitationsForEmail(userId, INVITED_EMAIL)).toEqual([]);
  });
});
