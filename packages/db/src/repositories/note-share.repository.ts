import type { FindingRule } from "@cyberlearn/lib";
import type { Category } from "@prisma/client";
import { prisma } from "../prisma.js";
import { moderationRepository } from "./moderation.repository.js";

/**
 * Handing a note to someone, and what stands between the two.
 *
 * Sharing is deliberately not "with anyone on the platform". A note is written
 * for a lesson by a person who is in a class, and the people it is useful to
 * are the people in that class. Keeping it there is also what makes the rest of
 * item 9 mean anything: the teacher who gets told about a refused share is the
 * teacher of the class the share was aimed at.
 *
 * The screen and the alert live here rather than in the server action because
 * they are not presentation. A second caller - an API route, a mobile client,
 * a later import - must not be able to share a note without going past them,
 * and the only way to guarantee that is for the write and the screen to be the
 * same function.
 */

/** Someone a note can be handed to. */
export interface ShareCandidate {
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  /** Their standing in the class, so the picker can say so. */
  kind: "PEER" | "TEACHER";
  /** The class they are shared with, for grouping. */
  className: string;
}

export interface ShareRecipient {
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  sharedAt: Date;
}

/** A note somebody else wrote and handed over. */
export interface IncomingNote {
  id: string;
  content: string;
  wordCount: number;
  updatedAt: Date;
  sharedAt: Date;
  lessonSlug: string;
  lessonTitle: string;
  lessonCategory: Category;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
}

export type ShareResult =
  /** Went out. `shared` counts the people newly given the note. */
  | { ok: true; shared: number; alreadyShared: number; refused: string[] }
  /** The screen refused it; nothing was written and the teachers were told. */
  | { ok: false; reason: "BLOCKED"; teachersNotified: number; rules: FindingRule[] }
  | { ok: false; reason: "NOT_FOUND" }
  | { ok: false; reason: "EMPTY" }
  | { ok: false; reason: "NO_RECIPIENT" };

const PERSON = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

/**
 * A class that still counts. Archiving a class - or the promotion it sits in -
 * is how a year is put away, and the people in a retired class are no longer
 * classmates for anything, including this.
 */
const LIVE_CLASS = { archivedAt: null, promotion: { archivedAt: null } } as const;

/** What a rule is called when a teacher, not a moderator, is reading it. */
const RULE_LABEL: Record<FindingRule, string> = {
  slur: "propos haineux",
  insult: "insultes",
  threat: "menaces",
  sexual: "contenu sexuel",
  "self-harm": "allusions au mal-être",
  "contact-details": "coordonnées personnelles",
  "link-spam": "liens suspects",
  shouting: "écriture en majuscules",
};

function personName(p: { displayName: string; username: string | null }): string {
  return p.displayName.trim() !== "" ? p.displayName : (p.username ?? "Un élève");
}

export const noteShareRepository = {
  /**
   * Everyone the author may hand a note to: the other members of their live
   * classes, and the teachers who follow them.
   *
   * The picker and the guard in share() read this same function on purpose. A
   * list built by one query and a check written from another is exactly how
   * "you can only share inside your class" ends up true of the interface and
   * false of the server.
   */
  async audienceFor(authorId: string): Promise<ShareCandidate[]> {
    const classes = await prisma.class.findMany({
      where: {
        ...LIVE_CLASS,
        OR: [
          { members: { some: { userId: authorId } } },
          { teachers: { some: { teacherId: authorId } } },
        ],
      },
      orderBy: { name: "asc" },
      select: {
        name: true,
        members: {
          orderBy: { user: { displayName: "asc" } },
          select: { user: { select: PERSON } },
        },
        teachers: { orderBy: { assignedAt: "asc" }, select: { teacher: { select: PERSON } } },
      },
    });

    // Two classes with the same teacher must not offer them twice; the first
    // class they appear in is the one they are listed under.
    const seen = new Set<string>([authorId]);
    const out: ShareCandidate[] = [];
    for (const klass of classes) {
      for (const t of klass.teachers) {
        if (seen.has(t.teacher.id)) continue;
        seen.add(t.teacher.id);
        out.push({ ...t.teacher, kind: "TEACHER", className: klass.name });
      }
      for (const m of klass.members) {
        if (seen.has(m.user.id)) continue;
        seen.add(m.user.id);
        out.push({ ...m.user, kind: "PEER", className: klass.name });
      }
    }
    return out;
  },

  /** Who currently holds the note, so the author can see it and take it back. */
  async listRecipients(authorId: string, noteId: string): Promise<ShareRecipient[]> {
    const rows = await prisma.noteShare.findMany({
      where: { noteId, note: { userId: authorId } },
      orderBy: { sharedAt: "desc" },
      select: { sharedAt: true, sharedWith: { select: PERSON } },
    });
    return rows.map((r) => ({ ...r.sharedWith, sharedAt: r.sharedAt }));
  },

  /** The notes other people have handed to this user, most recent first. */
  async listSharedWithMe(userId: string): Promise<IncomingNote[]> {
    const rows = await prisma.noteShare.findMany({
      where: { sharedWithId: userId },
      orderBy: { sharedAt: "desc" },
      select: {
        sharedAt: true,
        note: {
          select: {
            id: true,
            content: true,
            wordCount: true,
            updatedAt: true,
            lesson: { select: { slug: true, title: true, category: true } },
            user: { select: PERSON },
          },
        },
      },
    });
    return rows.map((r) => ({
      id: r.note.id,
      content: r.note.content,
      wordCount: r.note.wordCount,
      updatedAt: r.note.updatedAt,
      sharedAt: r.sharedAt,
      lessonSlug: r.note.lesson.slug,
      lessonTitle: r.note.lesson.title,
      lessonCategory: r.note.lesson.category,
      authorId: r.note.user.id,
      authorName: personName(r.note.user),
      authorAvatarUrl: r.note.user.avatarUrl,
    }));
  },

  /**
   * Hands a note to people, once it has been read by the screen.
   *
   * On a refusal nothing is written: no share row, no notification to the
   * people it was aimed at. The author's teachers are told instead, which is
   * the whole point of screening this surface rather than letting a note go
   * straight out - a student writing something ugly to their class is a thing
   * the teacher has to know about, and a silent refusal tells nobody.
   *
   * A teacher is told once per refusal, not once per intended recipient.
   */
  async share(input: {
    authorId: string;
    noteId: string;
    recipientIds: string[];
  }): Promise<ShareResult> {
    const note = await prisma.note.findFirst({
      where: { id: input.noteId, userId: input.authorId },
      select: {
        id: true,
        content: true,
        lesson: { select: { title: true } },
        user: { select: { displayName: true, username: true } },
      },
    });
    if (!note) return { ok: false, reason: "NOT_FOUND" };
    if (note.content.trim() === "") return { ok: false, reason: "EMPTY" };

    const wanted = new Set(input.recipientIds);
    if (wanted.size === 0) return { ok: false, reason: "NO_RECIPIENT" };

    const audience = await this.audienceFor(input.authorId);
    const allowed = new Set(audience.map((p) => p.id));
    const targets = [...wanted].filter((id) => allowed.has(id));
    const refused = [...wanted].filter((id) => !allowed.has(id));
    if (targets.length === 0) return { ok: false, reason: "NO_RECIPIENT" };

    // Links are not ordinary in a note handed to a classmate, so they count.
    const screen = await moderationRepository.screen({
      text: note.content,
      surface: "note.share",
      userId: input.authorId,
    });

    if (!screen.allowed) {
      const teachersNotified = await alertTeachersOf({
        studentId: input.authorId,
        studentName: personName(note.user),
        lessonTitle: note.lesson.title,
        noteId: note.id,
        rules: screen.findings.map((f) => f.rule),
      });
      return {
        ok: false,
        reason: "BLOCKED",
        teachersNotified,
        rules: [...new Set(screen.findings.map((f) => f.rule))],
      };
    }

    // Who already holds it is read before the insert, not inferred from the
    // insert's count afterwards: the new rows all carry the same timestamp, so
    // "the most recent N" cannot tell them apart from one another or from an
    // older share written in the same millisecond.
    const existing = await prisma.noteShare.findMany({
      where: { noteId: note.id, sharedWithId: { in: targets } },
      select: { sharedWithId: true },
    });
    const held = new Set(existing.map((e) => e.sharedWithId));
    const fresh = targets.filter((id) => !held.has(id));

    if (fresh.length > 0) {
      await prisma.noteShare.createMany({
        data: fresh.map((id) => ({ noteId: note.id, sharedWithId: id })),
        // Re-sharing with someone who already has it is a no-op, not an error:
        // the author is picking from a list that already shows them as holders.
        skipDuplicates: true,
      });
    }

    if (screen.eventId !== null) {
      await moderationRepository.attachContent(screen.eventId, note.id);
    }

    // Only the people who did not already have it are told, or every re-share
    // would ping the whole class again.
    await notifyRecipients({
      recipientIds: fresh,
      authorName: personName(note.user),
      lessonTitle: note.lesson.title,
      noteId: note.id,
    });

    return {
      ok: true,
      shared: fresh.length,
      alreadyShared: targets.length - fresh.length,
      refused,
    };
  },

  /** Takes the note back from one person. */
  async unshare(authorId: string, noteId: string, recipientId: string): Promise<boolean> {
    const res = await prisma.noteShare.deleteMany({
      where: { noteId, sharedWithId: recipientId, note: { userId: authorId } },
    });
    return res.count > 0;
  },
};

/**
 * Tells the teachers of every live class the student belongs to.
 *
 * Membership, not teaching: a teacher whose own note is refused has no
 * "professeur" above them, and telling their colleagues would be gossip rather
 * than supervision.
 *
 * A failure here is logged and swallowed. The share is already refused, and an
 * author who gets an error page instead of a refusal learns less about what
 * happened, not more.
 */
async function alertTeachersOf(input: {
  studentId: string;
  studentName: string;
  lessonTitle: string;
  noteId: string;
  rules: FindingRule[];
}): Promise<number> {
  try {
    const rows = await prisma.classTeacher.findMany({
      where: { class: { ...LIVE_CLASS, members: { some: { userId: input.studentId } } } },
      select: { teacherId: true, class: { select: { id: true, name: true } } },
    });
    // One student can sit in two of the same teacher's classes.
    const byTeacher = new Map<string, { id: string; name: string }>();
    for (const row of rows) {
      if (!byTeacher.has(row.teacherId)) byTeacher.set(row.teacherId, row.class);
    }
    if (byTeacher.size === 0) return 0;

    // Named in plain French rather than as rule ids: the reader is a teacher,
    // not a moderator, and "slur, insult" means nothing to them.
    const labels = [...new Set(input.rules)].map((r) => RULE_LABEL[r]);
    const detail = labels.length > 0 ? ` Motif : ${labels.join(", ")}.` : "";

    await prisma.notification.createMany({
      data: [...byTeacher].map(([teacherId, klass]) => ({
        userId: teacherId,
        type: "MODERATION_ALERT" as const,
        title: `Partage bloqué · ${klass.name}`,
        body:
          `${input.studentName} a tenté de partager une note sur « ${input.lessonTitle} » ` +
          `dont le contenu a été jugé inapproprié. Le partage a été bloqué.${detail}`,
        metadata: {
          studentId: input.studentId,
          classId: klass.id,
          noteId: input.noteId,
          rules: labels,
        },
      })),
    });
    return byTeacher.size;
  } catch (error) {
    console.error("[note-share] failed to alert teachers:", error);
    return 0;
  }
}

/** Tells the people who were just given the note. Never blocks the share. */
async function notifyRecipients(input: {
  recipientIds: string[];
  authorName: string;
  lessonTitle: string;
  noteId: string;
}): Promise<void> {
  if (input.recipientIds.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: input.recipientIds.map((userId) => ({
        userId,
        type: "NOTE_SHARED" as const,
        title: "Une note partagée avec vous",
        body: `${input.authorName} vous a partagé sa note sur « ${input.lessonTitle} ».`,
        actionUrl: "/notes",
        metadata: { noteId: input.noteId },
      })),
    });
  } catch (error) {
    console.error("[note-share] failed to notify recipients:", error);
  }
}
