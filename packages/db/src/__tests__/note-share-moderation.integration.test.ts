/**
 * What the screen does to a shared note - against the real DB.
 *
 * This surface behaves unlike every other one, and the difference is the whole
 * point of the file. Everywhere else a flagged message is written hidden and a
 * reviewer decides its fate. Sharing publishes no row of its own: the note
 * stays where it was, private and the author's, so there is nothing to hide
 * and nothing for a decision to reach.
 *
 * Two consequences are asserted here, because both were wrong in production:
 * a flagged share is refused rather than let through on a REVIEW, and it
 * leaves no queue row pointing at content - which is what made the console
 * offer "rétablir" and "supprimer" on a note and do nothing with either.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { noteShareRepository } from "../repositories/note-share.repository.js";

const suffix = randomUUID().slice(0, 8);
const author = randomUUID();
const friend = randomUUID();
const teacher = randomUUID();
const lessonId = randomUUID();
const noteId = randomUUID();
const establishmentId = randomUUID();
const promotionId = randomUUID();
const classId = randomUUID();

let configured = false;

/** The pair is stored in order, smallest id first; who asked is its own column. */
const [userAId, userBId] = author < friend ? [author, friend] : [friend, author];

describe("a shared note, read by the screen (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;

    await prisma.user.createMany({
      data: [
        { id: author, email: `share-a-${suffix}@t.internal`, displayName: `A ${suffix}` },
        { id: friend, email: `share-b-${suffix}@t.internal`, displayName: `B ${suffix}` },
        {
          id: teacher,
          email: `share-t-${suffix}@t.internal`,
          displayName: `T ${suffix}`,
          role: "TEACHER",
        },
      ],
      skipDuplicates: true,
    });
    // A live class with the author in it and a teacher above them: the shape
    // alertTeachersOf reads, and the only shape that makes "prévenir le prof"
    // mean anything. Membership, not teaching - a teacher's own refused share
    // has nobody above it.
    await prisma.establishment.create({
      data: { id: establishmentId, name: `Lycée ${suffix}`, slug: `lycee-${suffix}` },
    });
    await prisma.promotion.create({
      data: { id: promotionId, establishmentId, name: `Promo ${suffix}`, slug: `promo-${suffix}` },
    });
    await prisma.class.create({
      data: { id: classId, promotionId, name: `Classe ${suffix}`, slug: `classe-${suffix}` },
    });
    await prisma.classMember.create({ data: { classId, userId: author } });
    await prisma.classTeacher.create({ data: { classId, teacherId: teacher } });
    // A friendship is the cheapest audience: sharing needs somebody allowed to
    // receive, and a class would need three more rows to say the same thing.
    await prisma.friendship.create({
      data: { userAId, userBId, requestedById: author, status: "ACCEPTED" },
    });
    await prisma.lesson.create({
      data: {
        id: lessonId,
        refCode: `CL-LSN-9${suffix.slice(0, 2)}-V01`,
        slug: `note-share-${suffix}`,
        title: "Leçon de test",
        description: "Une leçon pour les tests de partage de note.",
        category: "DEV",
        difficulty: "BEGINNER",
        estimatedMinutes: 10,
        xpReward: 10,
        contentMdx: "# Test",
      },
    });
    configured = true;
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.noteShare.deleteMany({ where: { noteId } });
    await prisma.note.deleteMany({ where: { id: noteId } });
    await prisma.moderationEvent.deleteMany({ where: { userId: author } });
    await prisma.notification.deleteMany({ where: { userId: { in: [teacher, friend] } } });
    await prisma.friendship.deleteMany({ where: { userAId, userBId } });
    await prisma.lesson.deleteMany({ where: { id: lessonId } });
    await prisma.establishment.deleteMany({ where: { id: establishmentId } });
    await prisma.user.deleteMany({ where: { id: { in: [author, friend, teacher] } } });
  });

  /** One note per author per lesson, so each case rewrites the same row. */
  async function writeNote(content: string): Promise<void> {
    await prisma.note.upsert({
      where: { id: noteId },
      create: {
        id: noteId,
        userId: author,
        lessonId,
        content,
        wordCount: content.split(" ").length,
      },
      update: { content },
    });
    await prisma.noteShare.deleteMany({ where: { noteId } });
    await prisma.moderationEvent.deleteMany({ where: { userId: author } });
    await prisma.notification.deleteMany({ where: { userId: { in: [teacher, friend] } } });
  }

  async function share(): ReturnType<typeof noteShareRepository.share> {
    return noteShareRepository.share({
      authorId: author,
      noteId,
      recipientIds: [friend],
    });
  }

  it("hands over a note nobody objects to", async () => {
    if (!configured) return;
    await writeNote("Voici mes notes sur les boucles for, j'espère que ça aide.");

    const result = await share();

    expect(result.ok).toBe(true);
    expect(await prisma.noteShare.count({ where: { noteId } })).toBe(1);
    // ALLOW records nothing: a row per acceptable sentence is a table nobody
    // can read.
    expect(await prisma.moderationEvent.count({ where: { userId: author } })).toBe(0);
  });

  it("refuses a share the screen only had doubts about", async () => {
    if (!configured) return;
    // Scores 50: one insult. Under the old rule this was a REVIEW and the
    // share went out anyway - the reviewer saw it afterwards, by which time a
    // classmate had read it, which nothing later can undo.
    await writeNote("Tu est nul vas te faire foutre");

    const result = await share();

    // Thrown rather than asserted, so the union is narrowed for what follows.
    if (result.ok) throw new Error("the share went out");
    expect(result.reason).toBe("BLOCKED");
    expect(await prisma.noteShare.count({ where: { noteId } })).toBe(0);
  });

  it("refuses an unambiguous one too, as it always did", async () => {
    if (!configured) return;
    await writeNote("connard de salope");

    const result = await share();

    expect(result.ok).toBe(false);
    expect(await prisma.noteShare.count({ where: { noteId } })).toBe(0);
  });

  it("leaves the refusal on the record, for a person to look at", async () => {
    if (!configured) return;
    await writeNote("Tu est nul vas te faire foutre");

    await share();

    const events = await prisma.moderationEvent.findMany({ where: { userId: author } });
    expect(events).toHaveLength(1);
    expect(events[0]?.surface).toBe("note.share");
    expect(events[0]?.outcome).toBe("PENDING");
  });

  it("does not point that record at any content", async () => {
    if (!configured) return;
    // The property the console reads to decide whether "rétablir" and
    // "supprimer" mean anything on this row. It used to be false: the note's
    // id was attached, so both buttons were drawn for a surface with no
    // handler for either, and closing the row changed nothing anywhere.
    //
    // It now holds for two reasons at once - the attach was removed, and a
    // refusal returns before reaching it - so this pins the outcome rather
    // than one of the two causes. isActionableEvent has the unit test that
    // pins the console's half.
    await writeNote("Tu est nul vas te faire foutre");

    await share();

    const event = await prisma.moderationEvent.findFirst({ where: { userId: author } });
    expect(event?.contentId).toBeNull();
  });

  it("keeps the note itself, which is the author's either way", async () => {
    if (!configured) return;
    await writeNote("Tu est nul vas te faire foutre");

    await share();

    // Nothing about a refused share touches the note. It is why refusing on a
    // doubt is affordable: the cost of being wrong is one retry.
    const note = await prisma.note.findUnique({ where: { id: noteId } });
    expect(note?.content).toBe("Tu est nul vas te faire foutre");
  });

  it("tells the author's teacher, on a doubt as much as on a certainty", async () => {
    // Reported as its own defect: nothing reached the teacher. Two causes at
    // once - the text scored zero, so nothing was refused, and a refusal on a
    // REVIEW did not exist to reach this. Both are fixed, and a teacher who
    // only hears about the unambiguous cases hears about almost none of them.
    if (!configured) return;
    await writeNote("Tu est nul vas te faire foutre");

    const result = await share();

    if (result.ok) throw new Error("the share went out");
    expect(result.reason === "BLOCKED" && result.teachersNotified).toBe(1);
    const alerts = await prisma.notification.findMany({ where: { userId: teacher } });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.type).toBe("MODERATION_ALERT");
    // Named in French, for a reader who is not a moderator.
    expect(alerts[0]?.body).toContain("insultes");
  });

  it("tells nobody the note was aimed at, since it never went out", async () => {
    if (!configured) return;
    await writeNote("Tu est nul vas te faire foutre");

    await share();

    expect(await prisma.notification.count({ where: { userId: friend } })).toBe(0);
  });
});
