"use server";

import { z } from "zod";
import { noteCardRepository } from "@cyberlearn/db";
import { CARD_SESSION_SIZE } from "@cyberlearn/lib/revisions/cards";
import { requireRequestUser } from "@/lib/auth";

/**
 * The deck taken from the learner's notes: the cards due, and the learner's
 * own verdict on each. Self-graded, so it moves the card and nothing else: no
 * XP, no streak, no quest (those stay with the lesson cards, checked on the
 * server).
 */

export interface DueNoteCard {
  id: string;
  noteId: string;
  noteTitle: string;
  front: string;
  back: string;
  box: number;
}

const SESSION_MAX = CARD_SESSION_SIZE * 4;

const loadSchema = z.object({ noteIds: z.array(z.guid()).max(2_000).optional() });
const answerSchema = z.object({ cardId: z.guid(), knew: z.boolean() });

/** The cards due today, optionally only those of some notes (a folder's). */
export async function loadDueNoteCardsAction(input: {
  noteIds?: string[] | undefined;
}): Promise<DueNoteCard[]> {
  const user = await requireRequestUser();
  const parsed = loadSchema.safeParse(input);
  if (!parsed.success) return [];
  const rows = await noteCardRepository.findDue(
    user.id,
    new Date(),
    SESSION_MAX,
    parsed.data.noteIds,
  );
  return rows.map((r) => ({
    id: r.id,
    noteId: r.noteId,
    noteTitle: r.noteTitle,
    front: r.front,
    back: r.back,
    box: r.box,
  }));
}

/** Record whether the learner knew the card. */
export async function answerNoteCardAction(input: {
  cardId: string;
  knew: boolean;
}): Promise<{ ok: boolean; box?: number; dueAt?: string; retired?: boolean }> {
  const user = await requireRequestUser();
  const parsed = answerSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const res = await noteCardRepository.answer(
    user.id,
    parsed.data.cardId,
    parsed.data.knew,
    new Date(),
  );
  if (!res) return { ok: false };
  return { ok: true, box: res.box, dueAt: res.dueAt.toISOString(), retired: res.retired };
}

/** How many note cards are due today, and how many are in review. */
export async function noteCardCountsAction(): Promise<{ due: number; total: number }> {
  const user = await requireRequestUser();
  return noteCardRepository.counts(user.id, new Date());
}
