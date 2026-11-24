import { answerCard, CARD_FIRST_BOX, dueAfter, dueCutoff } from "@cyberlearn/lib/revisions/cards";
import { noteDisplayTitle } from "@cyberlearn/lib/notes/workspace";
import { prisma } from "../prisma.js";

/** A card as the note-card session shows it. */
export interface NoteCardRow {
  id: string;
  noteId: string;
  noteTitle: string;
  front: string;
  back: string;
  box: number;
  dueAt: Date;
}

const ROW_SELECT = {
  id: true,
  noteId: true,
  front: true,
  back: true,
  box: true,
  dueAt: true,
  note: { select: { title: true, lesson: { select: { title: true } } } },
} as const;

function toRow(r: {
  id: string;
  noteId: string;
  front: string;
  back: string;
  box: number;
  dueAt: Date;
  note: { title: string; lesson: { title: string } | null };
}): NoteCardRow {
  return {
    id: r.id,
    noteId: r.noteId,
    noteTitle: noteDisplayTitle(r.note.title, r.note.lesson?.title),
    front: r.front,
    back: r.back,
    box: r.box,
    dueAt: r.dueAt,
  };
}

/** Only cards of live notes: a note in the trash takes its cards out of review. */
const LIVE_NOTE = { note: { deletedAt: null } } as const;

export const noteCardRepository = {
  /**
   * Make a note's deck match `cards` (keyed by a hash of each question): new
   * questions enter the first box, due tomorrow; a question still there keeps
   * its progress and takes the current answer; a question gone from the note
   * leaves the deck. Returns null when the note is not a live note of the user.
   */
  async syncForNote(
    userId: string,
    noteId: string,
    cards: readonly { key: string; front: string; back: string }[],
    now: Date,
  ): Promise<{ added: number; updated: number; removed: number } | null> {
    return prisma.$transaction(async (tx) => {
      const note = await tx.note.findFirst({
        where: { id: noteId, userId, deletedAt: null },
        select: { id: true },
      });
      if (!note) return null;
      const existing = await tx.noteCard.findMany({
        where: { noteId },
        select: { id: true, key: true, front: true, back: true },
      });
      const byKey = new Map(existing.map((c) => [c.key, c]));
      const keep = new Set(cards.map((c) => c.key));
      let added = 0;
      let updated = 0;
      for (const card of cards) {
        const old = byKey.get(card.key);
        if (!old) {
          await tx.noteCard.create({
            data: {
              userId,
              noteId,
              key: card.key,
              front: card.front,
              back: card.back,
              box: CARD_FIRST_BOX,
              dueAt: dueAfter(now, 0),
            },
          });
          added += 1;
        } else if (old.front !== card.front || old.back !== card.back) {
          await tx.noteCard.update({
            where: { id: old.id },
            data: { front: card.front, back: card.back },
          });
          updated += 1;
        }
      }
      const gone = existing.filter((c) => !keep.has(c.key)).map((c) => c.id);
      if (gone.length > 0) await tx.noteCard.deleteMany({ where: { id: { in: gone } } });
      return { added, updated, removed: gone.length };
    });
  },

  /** The cards of one of the user's notes, in box order. */
  async listForNote(userId: string, noteId: string): Promise<NoteCardRow[]> {
    const rows = await prisma.noteCard.findMany({
      where: { userId, noteId },
      orderBy: [{ box: "asc" }, { createdAt: "asc" }],
      select: ROW_SELECT,
    });
    return rows.map(toRow);
  },

  /**
   * The user's cards due today, from live notes, most overdue and lowest box
   * first; `noteIds` narrows them to some notes (a folder's).
   */
  async findDue(
    userId: string,
    now: Date,
    limit: number,
    noteIds?: readonly string[],
  ): Promise<NoteCardRow[]> {
    const rows = await prisma.noteCard.findMany({
      where: {
        userId,
        retiredAt: null,
        dueAt: { lte: dueCutoff(now) },
        ...LIVE_NOTE,
        ...(noteIds ? { noteId: { in: [...noteIds] } } : {}),
      },
      orderBy: [{ dueAt: "asc" }, { box: "asc" }, { createdAt: "asc" }],
      take: limit,
      select: ROW_SELECT,
    });
    return rows.map(toRow);
  },

  /** How many cards are due today, and how many the user holds in review. */
  async counts(userId: string, now: Date): Promise<{ due: number; total: number }> {
    const [due, total] = await Promise.all([
      prisma.noteCard.count({
        where: { userId, retiredAt: null, dueAt: { lte: dueCutoff(now) }, ...LIVE_NOTE },
      }),
      prisma.noteCard.count({ where: { userId, retiredAt: null, ...LIVE_NOTE } }),
    ]);
    return { due, total };
  },

  /**
   * Record the learner's own verdict on a card: up a box when they knew it,
   * back to the first when not (the lesson cards' rules). Returns the card's
   * new box and due date, or null when it is not one of the user's live cards.
   */
  async answer(
    userId: string,
    cardId: string,
    knew: boolean,
    now: Date,
  ): Promise<{ box: number; dueAt: Date; retired: boolean } | null> {
    const card = await prisma.noteCard.findFirst({
      where: { id: cardId, userId, retiredAt: null, ...LIVE_NOTE },
      select: { box: true, dueAt: true, lapses: true },
    });
    if (!card) return null;
    const next = answerCard({ ...card, everCorrect: false }, knew, now);
    const res = await prisma.noteCard.updateMany({
      where: { id: cardId, userId, retiredAt: null },
      data: {
        box: next.box,
        dueAt: next.dueAt,
        lapses: next.lapses,
        lastAnsweredAt: next.lastAnsweredAt,
        retiredAt: next.retiredAt,
      },
    });
    if (res.count === 0) return null;
    return { box: next.box, dueAt: next.dueAt, retired: next.retiredAt !== null };
  },

  /** Put a note's retired cards back in review, from the first box. */
  async resetForNote(userId: string, noteId: string, now: Date): Promise<number> {
    const res = await prisma.noteCard.updateMany({
      where: { userId, noteId },
      data: { box: CARD_FIRST_BOX, dueAt: dueAfter(now, 0), retiredAt: null, lapses: 0 },
    });
    return res.count;
  },

  /** Every card the account holds, for its GDPR export (rgpd/build-export.ts). */
  async exportFor(userId: string) {
    return prisma.noteCard.findMany({
      where: { userId },
      select: {
        front: true,
        back: true,
        box: true,
        dueAt: true,
        retiredAt: true,
        createdAt: true,
        note: { select: { title: true } },
      },
    });
  },
};
