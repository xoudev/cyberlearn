/**
 * Handing a note over - who may receive one, and what happens when the screen
 * says no - against the real DB.
 *
 * The things this suite exists to hold down are the ones that would be quietly
 * wrong otherwise: that the audience is the author's classes and friends and
 * not the platform, that an unanswered friend request grants nothing, and that
 * a refused share reaches the teacher. All of them are invisible in an
 * interface that only ever offers the right people, which is exactly why they
 * are checked here against the server rather than there.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterEach, afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { friendshipRepository } from "../repositories/friendship.repository.js";
import { noteShareRepository } from "../repositories/note-share.repository.js";

const suffix = randomUUID().slice(0, 8);

// Class A: teachers T1 + T2, students S1 and S2.
// Class B: teacher T2 again, student S1 again and student S3.
// Class Z: archived, holds S1 and the outsider O.
const T1 = randomUUID();
const T2 = randomUUID();
const S1 = randomUUID();
const S2 = randomUUID();
const S3 = randomUUID();
const OUT = randomUUID();

const estId = randomUUID();
const promoId = randomUUID();
const classA = randomUUID();
const classB = randomUUID();
const classZ = randomUUID();
const lessonId = randomUUID();

/** S1's note - the one being handed around. */
const noteId = randomUUID();

const CLEAN = "Le modèle OSI a sept couches, de la physique à l'application.";
const FOUL = "ferme ta gueule sale negre";

let configured = false;
const everyone = [T1, T2, S1, S2, S3, OUT];

async function resetNote(content = CLEAN): Promise<void> {
  await prisma.noteShare.deleteMany({ where: { noteId } });
  await prisma.note.update({ where: { id: noteId }, data: { content } });
}

describe("note sharing (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;

    await prisma.user.createMany({
      data: [
        {
          id: T1,
          email: `t1-${suffix}@t.internal`,
          username: `t1${suffix}`,
          displayName: "Tina",
          role: "TEACHER",
        },
        {
          id: T2,
          email: `t2-${suffix}@t.internal`,
          username: `t2${suffix}`,
          displayName: "Marc",
          role: "TEACHER",
        },
        { id: S1, email: `s1-${suffix}@t.internal`, username: `s1${suffix}`, displayName: "Sacha" },
        { id: S2, email: `s2-${suffix}@t.internal`, username: `s2${suffix}`, displayName: "Nadia" },
        { id: S3, email: `s3-${suffix}@t.internal`, username: `s3${suffix}`, displayName: "Yanis" },
        { id: OUT, email: `o-${suffix}@t.internal`, username: `o${suffix}`, displayName: "Dehors" },
      ],
    });

    await prisma.establishment.create({
      data: { id: estId, name: `Lycée ${suffix}`, slug: `lycee-${suffix}` },
    });
    await prisma.promotion.create({
      data: { id: promoId, establishmentId: estId, name: "2025-2026", slug: `p-${suffix}` },
    });
    await prisma.class.createMany({
      data: [
        { id: classA, promotionId: promoId, name: "SIO1-A", slug: `a-${suffix}` },
        { id: classB, promotionId: promoId, name: "SIO1-B", slug: `b-${suffix}` },
        {
          id: classZ,
          promotionId: promoId,
          name: "SIO1-Z",
          slug: `z-${suffix}`,
          archivedAt: new Date(),
        },
      ],
    });
    await prisma.classTeacher.createMany({
      data: [
        { classId: classA, teacherId: T1 },
        { classId: classA, teacherId: T2 },
        { classId: classB, teacherId: T2 },
        { classId: classZ, teacherId: T1 },
      ],
    });
    await prisma.classMember.createMany({
      data: [
        { classId: classA, userId: S1 },
        { classId: classA, userId: S2 },
        { classId: classB, userId: S1 },
        { classId: classB, userId: S3 },
        { classId: classZ, userId: S1 },
        { classId: classZ, userId: OUT },
      ],
    });

    await prisma.lesson.create({
      data: {
        id: lessonId,
        refCode: `CL-LSN-${suffix}`,
        slug: `lesson-${suffix}`,
        title: "Le modèle OSI",
        description: "Les sept couches.",
        category: "NETWORK",
        difficulty: "BEGINNER",
        estimatedMinutes: 20,
        xpReward: 50,
        contentMdx: "# OSI",
        authorId: T1,
      },
    });
    await prisma.note.create({
      data: { id: noteId, userId: S1, lessonId, content: CLEAN, wordCount: 11 },
    });

    configured = true;
  });

  afterEach(async () => {
    if (!configured) return;
    // Several tests assert an exact audience, so a friendship left behind by
    // one of them would silently rewrite the next one's expectations.
    await prisma.friendship.deleteMany({
      where: { OR: [{ userAId: { in: everyone } }, { userBId: { in: everyone } }] },
    });
    await prisma.noteShare.deleteMany({ where: { noteId } });
    await prisma.notification.deleteMany({ where: { userId: { in: everyone } } });
    await prisma.moderationEvent.deleteMany({ where: { userId: { in: everyone } } });
    await prisma.note.update({ where: { id: noteId }, data: { content: CLEAN } });
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.friendship.deleteMany({
      where: { OR: [{ userAId: { in: everyone } }, { userBId: { in: everyone } }] },
    });
    await prisma.noteShare.deleteMany({ where: { noteId } });
    await prisma.note.deleteMany({ where: { userId: { in: everyone } } });
    await prisma.lesson.deleteMany({ where: { id: lessonId } });
    await prisma.notification.deleteMany({ where: { userId: { in: everyone } } });
    await prisma.moderationEvent.deleteMany({ where: { userId: { in: everyone } } });
    await prisma.classMember.deleteMany({ where: { userId: { in: everyone } } });
    await prisma.classTeacher.deleteMany({ where: { teacherId: { in: everyone } } });
    await prisma.class.deleteMany({ where: { id: { in: [classA, classB, classZ] } } });
    await prisma.promotion.deleteMany({ where: { id: promoId } });
    await prisma.establishment.deleteMany({ where: { id: estId } });
    await prisma.user.deleteMany({ where: { id: { in: everyone } } });
  });

  // ─── Who is on the list ──────────────────────────────────────────────────

  it("offers the classmates and the teachers of every live class, and nobody else", async () => {
    if (!configured) return;
    const audience = await noteShareRepository.audienceFor(S1);
    const ids = audience.map((p) => p.id).sort();

    // S2 and S3 are classmates through A and B; T1 and T2 teach them. OUT only
    // shares the archived class, and S1 is not offered themselves.
    expect(ids).toEqual([T1, T2, S2, S3].sort());
    expect(audience.find((p) => p.id === T1)?.kind).toBe("TEACHER");
    expect(audience.find((p) => p.id === S2)?.kind).toBe("PEER");
  });

  it("lists a teacher of two of the same classes once", async () => {
    if (!configured) return;
    const audience = await noteShareRepository.audienceFor(S1);
    expect(audience.filter((p) => p.id === T2)).toHaveLength(1);
  });

  it("offers nothing to somebody whose only class is archived", async () => {
    if (!configured) return;
    expect(await noteShareRepository.audienceFor(OUT)).toEqual([]);
  });

  it("lets a teacher share down into the classes they follow", async () => {
    if (!configured) return;
    const ids = (await noteShareRepository.audienceFor(T1)).map((p) => p.id).sort();
    // Class A only: T1 does not teach B, so S3 is not theirs to write to.
    expect(ids).toEqual([T2, S1, S2].sort());
  });

  it("groups people under the id of their class, not its name", async () => {
    if (!configured) return;
    const audience = await noteShareRepository.audienceFor(S1);
    // S2 is only in A and S3 only in B, so their headings must differ - and be
    // the classes' ids, which is what keeps two classes of the same name apart.
    expect(audience.find((p) => p.id === S2)?.groupId).toBe(classA);
    expect(audience.find((p) => p.id === S3)?.groupId).toBe(classB);
    expect(audience.find((p) => p.id === S2)?.groupLabel).toBe("SIO1-A");
  });

  // ─── Friends, who are not classmates ─────────────────────────────────────

  it("offers a friend who shares no live class with the author", async () => {
    if (!configured) return;
    await friendshipRepository.request(S1, OUT);
    await friendshipRepository.accept(OUT, S1);

    const audience = await noteShareRepository.audienceFor(S1);
    const friend = audience.find((p) => p.id === OUT);
    expect(friend).toMatchObject({ kind: "FRIEND", groupId: "friends", groupLabel: "Amis" });

    // And both ways round: OUT's only reachable person is now S1.
    expect((await noteShareRepository.audienceFor(OUT)).map((p) => p.id)).toEqual([S1]);
  });

  it("offers nothing to somebody who has only been asked", async () => {
    if (!configured) return;
    await friendshipRepository.request(S1, OUT);

    // Asking is not being accepted. A pending row that granted anything would
    // mean anyone could reach anyone by pressing a button.
    expect((await noteShareRepository.audienceFor(S1)).map((p) => p.id)).not.toContain(OUT);
    expect(await noteShareRepository.audienceFor(OUT)).toEqual([]);
  });

  it("lists a classmate who is also a friend once, under their class", async () => {
    if (!configured) return;
    await friendshipRepository.request(S1, S2);
    await friendshipRepository.accept(S2, S1);

    const audience = await noteShareRepository.audienceFor(S1);
    expect(audience.filter((p) => p.id === S2)).toHaveLength(1);
    expect(audience.find((p) => p.id === S2)).toMatchObject({ kind: "PEER", groupId: classA });
  });

  it("stops offering somebody the moment the friendship ends", async () => {
    if (!configured) return;
    await friendshipRepository.request(S1, OUT);
    await friendshipRepository.accept(OUT, S1);
    await friendshipRepository.remove(OUT, S1);

    expect(await noteShareRepository.audienceFor(S1)).not.toContainEqual(
      expect.objectContaining({ id: OUT }),
    );
  });

  it("hands the note to a friend and tells them", async () => {
    if (!configured) return;
    await friendshipRepository.request(S1, OUT);
    await friendshipRepository.accept(OUT, S1);

    const res = await noteShareRepository.share({ authorId: S1, noteId, recipientIds: [OUT] });

    expect(res).toMatchObject({ ok: true, shared: 1, refused: [] });
    expect(await prisma.noteShare.count({ where: { noteId, sharedWithId: OUT } })).toBe(1);
    expect(await prisma.notification.count({ where: { userId: OUT } })).toBe(1);
  });

  it("refuses a note aimed at somebody who has only sent a request", async () => {
    if (!configured) return;
    await friendshipRepository.request(OUT, S1);

    const res = await noteShareRepository.share({ authorId: S1, noteId, recipientIds: [OUT] });

    expect(res).toEqual({ ok: false, reason: "NO_RECIPIENT" });
    expect(await prisma.noteShare.count({ where: { noteId } })).toBe(0);
  });

  // ─── The share itself ────────────────────────────────────────────────────

  it("hands the note to a classmate and tells them", async () => {
    if (!configured) return;
    const res = await noteShareRepository.share({
      authorId: S1,
      noteId,
      recipientIds: [S2],
    });

    expect(res).toMatchObject({ ok: true, shared: 1, alreadyShared: 0, refused: [] });
    expect(await prisma.noteShare.count({ where: { noteId, sharedWithId: S2 } })).toBe(1);

    const notes = await prisma.notification.findMany({ where: { userId: S2 } });
    expect(notes).toHaveLength(1);
    expect(notes[0]?.type).toBe("NOTE_SHARED");
    expect(notes[0]?.body).toContain("Sacha");
  });

  it("refuses somebody who is not in any of the author's classes", async () => {
    if (!configured) return;
    const res = await noteShareRepository.share({
      authorId: S1,
      noteId,
      recipientIds: [OUT],
    });

    expect(res).toEqual({ ok: false, reason: "NO_RECIPIENT" });
    expect(await prisma.noteShare.count({ where: { noteId } })).toBe(0);
    expect(await prisma.notification.count({ where: { userId: OUT } })).toBe(0);
  });

  it("shares with the classmates in a mixed list and names the ones it dropped", async () => {
    if (!configured) return;
    const res = await noteShareRepository.share({
      authorId: S1,
      noteId,
      recipientIds: [S2, OUT],
    });

    expect(res).toMatchObject({ ok: true, shared: 1, refused: [OUT] });
    expect(await prisma.noteShare.count({ where: { noteId } })).toBe(1);
  });

  it("does not notify twice when the same person is shared with again", async () => {
    if (!configured) return;
    await noteShareRepository.share({ authorId: S1, noteId, recipientIds: [S2] });
    const again = await noteShareRepository.share({ authorId: S1, noteId, recipientIds: [S2] });

    expect(again).toMatchObject({ ok: true, shared: 0, alreadyShared: 1 });
    expect(await prisma.noteShare.count({ where: { noteId } })).toBe(1);
    expect(await prisma.notification.count({ where: { userId: S2 } })).toBe(1);
  });

  it("will not share an empty note, or somebody else's", async () => {
    if (!configured) return;
    await prisma.note.update({ where: { id: noteId }, data: { content: "   " } });
    expect(await noteShareRepository.share({ authorId: S1, noteId, recipientIds: [S2] })).toEqual({
      ok: false,
      reason: "EMPTY",
    });

    await prisma.note.update({ where: { id: noteId }, data: { content: CLEAN } });
    expect(await noteShareRepository.share({ authorId: S2, noteId, recipientIds: [S1] })).toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });
  });

  // ─── The screen, and the teacher ─────────────────────────────────────────

  it("blocks an ugly note, shares nothing, and tells the author's teachers", async () => {
    if (!configured) return;
    await resetNote(FOUL);

    const res = await noteShareRepository.share({
      authorId: S1,
      noteId,
      recipientIds: [S2],
    });

    expect(res).toMatchObject({ ok: false, reason: "BLOCKED" });
    // Nothing went out: no row, and the person it was aimed at hears nothing.
    expect(await prisma.noteShare.count({ where: { noteId } })).toBe(0);
    expect(await prisma.notification.count({ where: { userId: S2 } })).toBe(0);

    // Both teachers of S1's live classes are told, once each.
    const alerts = await prisma.notification.findMany({
      where: { type: "MODERATION_ALERT" },
      orderBy: { userId: "asc" },
    });
    expect(alerts.map((a) => a.userId).sort()).toEqual([T1, T2].sort());
    expect(res).toMatchObject({ teachersNotified: 2 });
    expect(alerts[0]?.body).toContain("Sacha");
    expect(alerts[0]?.body).toContain("Le modèle OSI");

    // And the refusal is reviewable rather than only felt by the author.
    const events = await prisma.moderationEvent.findMany({ where: { userId: S1 } });
    expect(events).toHaveLength(1);
    expect(events[0]?.surface).toBe("note.share");
    expect(events[0]?.verdict).toBe("BLOCK");
  });

  it("names the reason in French, not in rule ids", async () => {
    if (!configured) return;
    await resetNote(FOUL);
    await noteShareRepository.share({ authorId: S1, noteId, recipientIds: [S2] });

    const alert = await prisma.notification.findFirst({ where: { userId: T1 } });
    expect(alert?.body).toContain("propos haineux");
    expect(alert?.body).not.toContain("slur");
  });

  it("has no teacher to tell when the author is the teacher", async () => {
    if (!configured) return;
    const teacherNote = await prisma.note.create({
      data: { userId: T1, lessonId, content: FOUL, wordCount: 5 },
    });

    const res = await noteShareRepository.share({
      authorId: T1,
      noteId: teacherNote.id,
      recipientIds: [S1],
    });

    expect(res).toMatchObject({ ok: false, reason: "BLOCKED", teachersNotified: 0 });
    // T2 teaches alongside T1; supervision is not the same as gossip.
    expect(await prisma.notification.count({ where: { type: "MODERATION_ALERT" } })).toBe(0);

    await prisma.note.delete({ where: { id: teacherNote.id } });
  });

  it("holds back a note that only warrants a look, without telling a teacher", async () => {
    if (!configured) return;
    // Two links on a surface where links are not expected: a doubt, not a
    // certainty. This used to go out and be reviewed afterwards, which is a
    // review of something a classmate has already read - sharing publishes,
    // so there is no hidden copy for a decision to reach. It is held back now.
    await resetNote("Mes sources : https://exemple.fr/osi et https://exemple.fr/tcp");

    const res = await noteShareRepository.share({ authorId: S1, noteId, recipientIds: [S2] });
    expect(res).toMatchObject({ ok: false, reason: "BLOCKED" });
    expect(await prisma.noteShare.count({ where: { noteId } })).toBe(0);

    const event = await prisma.moderationEvent.findFirst({ where: { userId: S1 } });
    expect(event?.verdict).toBe("REVIEW");
    // No content is attached: nothing was published, so the console has no
    // "rétablir" or "supprimer" to offer and must not draw them.
    expect(event?.contentId).toBeNull();
    // And no teacher is told. Refusing costs a retry; telling a teacher their
    // student wrote something inappropriate over two source links is a false
    // accusation, and enough of those and nobody reads the alerts at all.
    expect(await prisma.notification.count({ where: { type: "MODERATION_ALERT" } })).toBe(0);
  });

  // ─── Taking it back, and reading it ──────────────────────────────────────

  it("shows the recipient the note and who wrote it", async () => {
    if (!configured) return;
    await noteShareRepository.share({ authorId: S1, noteId, recipientIds: [S2] });

    const incoming = await noteShareRepository.listSharedWithMe(S2);
    expect(incoming).toHaveLength(1);
    expect(incoming[0]).toMatchObject({
      id: noteId,
      authorId: S1,
      authorName: "Sacha",
      lessonTitle: "Le modèle OSI",
      content: CLEAN,
    });
    // Nobody else's library grew.
    expect(await noteShareRepository.listSharedWithMe(S3)).toEqual([]);
  });

  it("takes the note back, and only from its own author", async () => {
    if (!configured) return;
    await noteShareRepository.share({ authorId: S1, noteId, recipientIds: [S2] });

    // S2 holds it; that does not let S2 rewrite who holds it.
    expect(await noteShareRepository.unshare(S2, noteId, S2)).toBe(false);
    expect(await prisma.noteShare.count({ where: { noteId } })).toBe(1);

    expect(await noteShareRepository.unshare(S1, noteId, S2)).toBe(true);
    expect(await prisma.noteShare.count({ where: { noteId } })).toBe(0);
    expect(await noteShareRepository.listSharedWithMe(S2)).toEqual([]);
  });

  it("lists who holds the note, to its author alone", async () => {
    if (!configured) return;
    await noteShareRepository.share({ authorId: S1, noteId, recipientIds: [S2, S3] });

    const holders = await noteShareRepository.listRecipients(S1, noteId);
    expect(holders.map((h) => h.id).sort()).toEqual([S2, S3].sort());
    expect(await noteShareRepository.listRecipients(S2, noteId)).toEqual([]);
  });
});
