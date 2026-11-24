import type { Category, Prisma } from "@prisma/client";
import { NOTES_MAX, noteDisplayTitle } from "@cyberlearn/lib/notes/workspace";
import { prisma } from "../prisma.js";
import { lessonsVisibleTo } from "./lesson.repository.js";

/** A note as the library lists it, with its lesson and that lesson's first path. */
export interface NoteSummary {
  id: string;
  title: string;
  lessonId: string | null;
  folderId: string | null;
  content: string;
  wordCount: number;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** Set when the note is in the trash. */
  deletedAt: Date | null;
  lessonSlug: string | null;
  lessonTitle: string | null;
  lessonCategory: Category | null;
  pathSlug: string | null;
  pathTitle: string | null;
}

const SUMMARY_SELECT = {
  id: true,
  title: true,
  lessonId: true,
  folderId: true,
  content: true,
  wordCount: true,
  pinned: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  lesson: {
    select: {
      slug: true,
      title: true,
      category: true,
      pathLessons: {
        orderBy: { position: "asc" },
        take: 1,
        select: { path: { select: { slug: true, title: true } } },
      },
    },
  },
} satisfies Prisma.NoteSelect;

type SummaryRow = Prisma.NoteGetPayload<{ select: typeof SUMMARY_SELECT }>;

function toSummary(r: SummaryRow): NoteSummary {
  return {
    id: r.id,
    title: noteDisplayTitle(r.title, r.lesson?.title),
    lessonId: r.lessonId,
    folderId: r.folderId,
    content: r.content,
    wordCount: r.wordCount,
    pinned: r.pinned,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    deletedAt: r.deletedAt,
    lessonSlug: r.lesson?.slug ?? null,
    lessonTitle: r.lesson?.title ?? null,
    lessonCategory: r.lesson?.category ?? null,
    pathSlug: r.lesson?.pathLessons[0]?.path.slug ?? null,
    pathTitle: r.lesson?.pathLessons[0]?.path.title ?? null,
  };
}

/** A note not in the trash. */
const LIVE = { deletedAt: null } as const;

/**
 * Serialize the workspace writes of one account: the note cap and the folder
 * tree are checked then written, and two requests racing between the check and
 * the write could each pass it. Held until the transaction ends.
 */
export async function lockNotesOf(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`notes:${userId}`}, 0))`;
}

/**
 * Move the user's live notes matching `where` to the trash, inside `tx`. A
 * trashed note gives its lesson up (so the lesson can take a new note), keeps
 * a title of its own, and stops being shared: nobody keeps reading a note its
 * author threw away. Returns how many moved.
 */
export async function trashNotesTx(
  tx: Prisma.TransactionClient,
  userId: string,
  where: Prisma.NoteWhereInput,
): Promise<number> {
  const notes = await tx.note.findMany({
    where: { ...where, userId, ...LIVE },
    select: { id: true, lessonId: true, title: true, lesson: { select: { title: true } } },
  });
  const now = new Date();
  for (const n of notes) {
    await tx.note.update({
      where: { id: n.id },
      data: {
        deletedAt: now,
        trashedLessonId: n.lessonId,
        lessonId: null,
        pinned: false,
        title: noteDisplayTitle(n.title, n.lesson?.title).slice(0, 120),
      },
    });
  }
  await tx.noteShare.deleteMany({ where: { noteId: { in: notes.map((n) => n.id) } } });
  return notes.length;
}

export type CreateNoteRefusal = "limit" | "folder" | "lesson" | "taken";

export type AttachResult =
  | { status: "attached"; noteId: string }
  | { status: "merged"; noteId: string }
  | { status: "conflict"; existingNoteId: string }
  | { status: "not-found" };

export const noteRepository = {
  /** The user's live note for one lesson (or null). */
  async findForLesson(userId: string, lessonId: string) {
    return prisma.note.findFirst({
      where: { userId, lessonId, ...LIVE },
      select: { id: true, title: true, content: true, wordCount: true, updatedAt: true },
    });
  },

  /** One of the user's notes, live or trashed, as the library shows it. */
  async findOwned(userId: string, noteId: string): Promise<NoteSummary | null> {
    const row = await prisma.note.findFirst({
      where: { id: noteId, userId },
      select: SUMMARY_SELECT,
    });
    return row ? toSummary(row) : null;
  },

  /**
   * Create or update the user's note on a lesson, from the lesson's drawer.
   * Saving an empty note there deletes it, so a drawer opened and left blank
   * leaves nothing behind; a note written in the library is never deleted by
   * emptying it. A new note takes the lesson's title. Returns null when the
   * note was cleared, or when the account is at NOTES_MAX.
   */
  async upsert(
    userId: string,
    lessonId: string,
    content: string,
    wordCount: number,
  ): Promise<{ id: string; wordCount: number; updatedAt: Date } | null> {
    if (content.trim().length === 0) {
      await prisma.note.deleteMany({ where: { userId, lessonId, ...LIVE } });
      return null;
    }
    return prisma.$transaction(async (tx) => {
      const existing = await tx.note.findFirst({
        where: { userId, lessonId, ...LIVE },
        select: { id: true },
      });
      if (existing) {
        return tx.note.update({
          where: { id: existing.id },
          data: { content, wordCount },
          select: { id: true, wordCount: true, updatedAt: true },
        });
      }
      await lockNotesOf(tx, userId);
      if ((await tx.note.count({ where: { userId } })) >= NOTES_MAX) return null;
      const lesson = await tx.lesson.findUnique({
        where: { id: lessonId },
        select: { title: true },
      });
      if (!lesson) return null;
      return tx.note.create({
        data: { userId, lessonId, content, wordCount, title: lesson.title.slice(0, 120) },
        select: { id: true, wordCount: true, updatedAt: true },
      });
    });
  },

  /**
   * Create a note in the library: free, or on a lesson the user may open, in
   * one of their own folders or at the root. Refused past NOTES_MAX, for a
   * folder that is not theirs, a lesson they cannot open, or a lesson that
   * already has their note.
   */
  async create(
    userId: string,
    input: {
      title: string;
      content: string;
      wordCount: number;
      folderId: string | null;
      lessonId?: string | null;
    },
  ): Promise<{ ok: true; note: NoteSummary } | { ok: false; reason: CreateNoteRefusal }> {
    return prisma.$transaction(async (tx) => {
      await lockNotesOf(tx, userId);
      if ((await tx.note.count({ where: { userId } })) >= NOTES_MAX) {
        return { ok: false, reason: "limit" } as const;
      }
      if (input.folderId !== null) {
        const folder = await tx.noteFolder.findFirst({
          where: { id: input.folderId, userId },
          select: { id: true },
        });
        if (!folder) return { ok: false, reason: "folder" } as const;
      }
      const lessonId = input.lessonId ?? null;
      if (lessonId !== null) {
        const lesson = await tx.lesson.findFirst({
          where: { id: lessonId, ...lessonsVisibleTo(userId) },
          select: { id: true },
        });
        if (!lesson) return { ok: false, reason: "lesson" } as const;
        const taken = await tx.note.findFirst({
          where: { userId, lessonId, ...LIVE },
          select: { id: true },
        });
        if (taken) return { ok: false, reason: "taken" } as const;
      }
      const row = await tx.note.create({
        data: {
          userId,
          title: input.title,
          content: input.content,
          wordCount: input.wordCount,
          folderId: input.folderId,
          lessonId,
        },
        select: SUMMARY_SELECT,
      });
      return { ok: true, note: toSummary(row) } as const;
    });
  },

  /** Save a live note's content. Returns null when no live note of the user matched. */
  async updateContent(
    userId: string,
    noteId: string,
    content: string,
    wordCount: number,
  ): Promise<{ wordCount: number; updatedAt: Date } | null> {
    const res = await prisma.note.updateMany({
      where: { id: noteId, userId, ...LIVE },
      data: { content, wordCount },
    });
    if (res.count === 0) return null;
    return prisma.note.findUnique({
      where: { id: noteId },
      select: { wordCount: true, updatedAt: true },
    });
  },

  /** Rename a live note. */
  async rename(userId: string, noteId: string, title: string): Promise<boolean> {
    const res = await prisma.note.updateMany({
      where: { id: noteId, userId, ...LIVE },
      data: { title },
    });
    return res.count > 0;
  },

  /** Pin or unpin a live note. */
  async setPinned(userId: string, noteId: string, pinned: boolean): Promise<boolean> {
    const res = await prisma.note.updateMany({
      where: { id: noteId, userId, ...LIVE },
      data: { pinned },
    });
    return res.count > 0;
  },

  async deleteForLesson(userId: string, lessonId: string): Promise<void> {
    await prisma.note.deleteMany({ where: { userId, lessonId, ...LIVE } });
  },

  /** Every note of a user, live and trashed, pinned first then newest first. */
  async findAllForUser(userId: string): Promise<NoteSummary[]> {
    const rows = await prisma.note.findMany({
      where: { userId },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      select: SUMMARY_SELECT,
    });
    return rows.map(toSummary);
  },

  /**
   * Move live notes into one of the user's folders, or out of any (null).
   * Ownership is checked on both sides. Returns how many notes moved; 0 when
   * the folder is not the user's.
   */
  async moveManyToFolder(
    userId: string,
    noteIds: readonly string[],
    folderId: string | null,
  ): Promise<number> {
    if (folderId !== null) {
      const folder = await prisma.noteFolder.findFirst({
        where: { id: folderId, userId },
        select: { id: true },
      });
      if (!folder) return 0;
    }
    const res = await prisma.note.updateMany({
      where: { id: { in: [...noteIds] }, userId, ...LIVE },
      data: { folderId },
    });
    return res.count;
  },

  /** One note into a folder (or out of any): moveManyToFolder for one. */
  async moveToFolder(userId: string, noteId: string, folderId: string | null): Promise<boolean> {
    return (await noteRepository.moveManyToFolder(userId, [noteId], folderId)) > 0;
  },

  /**
   * Tie a live note to a lesson the user may open. When the user already has a
   * note on that lesson, "attach" stops with a conflict, and "merge" appends
   * this note to that one and moves this one to the trash: the lesson keeps a
   * single note and nothing written is lost.
   */
  async attachToLesson(
    userId: string,
    noteId: string,
    lessonId: string,
    mode: "attach" | "merge",
  ): Promise<AttachResult> {
    return prisma.$transaction(async (tx) => {
      await lockNotesOf(tx, userId);
      const note = await tx.note.findFirst({
        where: { id: noteId, userId, ...LIVE },
        select: { id: true, title: true, content: true, wordCount: true, lessonId: true },
      });
      const lesson = await tx.lesson.findFirst({
        where: { id: lessonId, ...lessonsVisibleTo(userId) },
        select: { id: true, title: true },
      });
      if (!note || !lesson) return { status: "not-found" } as const;
      if (note.lessonId === lessonId) return { status: "attached", noteId } as const;

      const existing = await tx.note.findFirst({
        where: { userId, lessonId, ...LIVE },
        select: { id: true, content: true, wordCount: true },
      });
      if (!existing) {
        await tx.note.update({
          where: { id: noteId },
          data: { lessonId, title: note.title.trim() ? note.title : lesson.title.slice(0, 120) },
        });
        return { status: "attached", noteId } as const;
      }
      if (mode === "attach") return { status: "conflict", existingNoteId: existing.id } as const;

      const heading = note.title.trim() || "Note fusionnée";
      const merged = `${existing.content.trimEnd()}\n\n---\n\n## ${heading}\n\n${note.content.trim()}\n`;
      await tx.note.update({
        where: { id: existing.id },
        data: { content: merged, wordCount: existing.wordCount + note.wordCount },
      });
      await trashNotesTx(tx, userId, { id: noteId });
      return { status: "merged", noteId: existing.id } as const;
    });
  },

  /** Untie a live note from its lesson: it stays, free, under the same title. */
  async detachFromLesson(userId: string, noteId: string): Promise<boolean> {
    const note = await prisma.note.findFirst({
      where: { id: noteId, userId, ...LIVE },
      select: { title: true, lesson: { select: { title: true } } },
    });
    if (!note) return false;
    const res = await prisma.note.updateMany({
      where: { id: noteId, userId, ...LIVE },
      data: {
        lessonId: null,
        title: noteDisplayTitle(note.title, note.lesson?.title).slice(0, 120),
      },
    });
    return res.count > 0;
  },

  /**
   * Move live notes to the trash. A trashed note gives its lesson up (so the
   * lesson can take a new note) and stops being shared: nobody keeps reading
   * a note its author threw away. Returns how many moved.
   */
  async trash(userId: string, noteIds: readonly string[]): Promise<number> {
    return prisma.$transaction((tx) => trashNotesTx(tx, userId, { id: { in: [...noteIds] } }));
  },

  /**
   * Take notes out of the trash. Each goes back to its lesson when that lesson
   * still exists and has no other note of the user; otherwise it comes back
   * free. Returns the ids restored and those that came back without their lesson.
   */
  async restore(
    userId: string,
    noteIds: readonly string[],
  ): Promise<{ restored: string[]; freed: string[] }> {
    return prisma.$transaction(async (tx) => {
      await lockNotesOf(tx, userId);
      const notes = await tx.note.findMany({
        where: { id: { in: [...noteIds] }, userId, deletedAt: { not: null } },
        select: { id: true, trashedLessonId: true },
      });
      const restored: string[] = [];
      const freed: string[] = [];
      for (const n of notes) {
        let lessonId: string | null = null;
        if (n.trashedLessonId !== null) {
          const [lesson, taken] = await Promise.all([
            tx.lesson.findUnique({ where: { id: n.trashedLessonId }, select: { id: true } }),
            tx.note.findFirst({
              where: { userId, lessonId: n.trashedLessonId, ...LIVE },
              select: { id: true },
            }),
          ]);
          if (lesson && !taken) lessonId = lesson.id;
          else freed.push(n.id);
        }
        await tx.note.update({
          where: { id: n.id },
          data: { deletedAt: null, trashedLessonId: null, lessonId },
        });
        restored.push(n.id);
      }
      return { restored, freed };
    });
  },

  /** Delete trashed notes for good. Only notes already in the trash. */
  async purge(userId: string, noteIds: readonly string[]): Promise<number> {
    const res = await prisma.note.deleteMany({
      where: { id: { in: [...noteIds] }, userId, deletedAt: { not: null } },
    });
    return res.count;
  },

  /** Empty the user's trash. */
  async emptyTrash(userId: string): Promise<number> {
    const res = await prisma.note.deleteMany({ where: { userId, deletedAt: { not: null } } });
    return res.count;
  },

  /** How many notes the user holds, trash included (the NOTES_MAX budget). */
  async countForUser(userId: string): Promise<number> {
    return prisma.note.count({ where: { userId } });
  },

  /** Every note the account wrote, in full, for its GDPR export (rgpd/build-export.ts). */
  async exportFor(userId: string) {
    return prisma.note.findMany({
      where: { userId },
      select: {
        title: true,
        content: true,
        wordCount: true,
        pinned: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        lesson: { select: { title: true } },
        folder: { select: { name: true } },
      },
    });
  },
};
