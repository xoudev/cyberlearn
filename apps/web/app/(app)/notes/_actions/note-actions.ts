"use server";

import { createHash } from "node:crypto";
import { z } from "zod";
import { lessonRepository, noteCardRepository, noteRepository } from "@cyberlearn/db";
import {
  countNoteWords,
  extractFlashcards,
  normalizeNoteTitle,
} from "@cyberlearn/lib/notes/rich-markdown";
import {
  cleanNoteTitle,
  NOTE_CARDS_PER_NOTE_MAX,
  NOTE_CONTENT_MAX,
  NOTE_TITLE_MAX,
  NOTES_MAX,
} from "@cyberlearn/lib/notes/workspace";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { requireRequestUser } from "@/lib/auth";
import { serializeNote } from "@/lib/notes/serialize";
import type { SerializedNote } from "../_components/notes-shared";

/**
 * The notes workspace's writes. Every one takes the session's user and checks
 * its input with Zod; the repositories scope every row by that user, so an id
 * from somebody else's account matches nothing.
 */

const contentSchema = z.string().max(NOTE_CONTENT_MAX);
const titleSchema = z.string().max(NOTE_TITLE_MAX * 2);
const idsSchema = z.array(z.guid()).min(1).max(NOTES_MAX);

const saveSchema = z.object({ lessonId: z.guid(), content: contentSchema });
const createSchema = z.object({
  title: titleSchema,
  content: contentSchema.optional(),
  folderId: z.guid().nullable(),
  lessonId: z.guid().nullable().optional(),
});
const updateSchema = z.object({ noteId: z.guid(), content: contentSchema });
const renameSchema = z.object({ noteId: z.guid(), title: titleSchema });
const pinSchema = z.object({ noteId: z.guid(), pinned: z.boolean() });
const moveSchema = z.object({ noteIds: idsSchema, folderId: z.guid().nullable() });
const attachSchema = z.object({
  noteId: z.guid(),
  lessonId: z.guid(),
  mode: z.enum(["attach", "merge"]),
});
const noteIdSchema = z.object({ noteId: z.guid() });
const lessonQuerySchema = z.object({ q: z.string().max(100) });

export interface SaveNoteResult {
  ok: boolean;
  wordCount?: number | undefined;
  savedAt?: string | undefined;
  /** The note's id, once it exists (the lesson drawer's first save creates it). */
  noteId?: string | undefined;
  error?: string | undefined;
}

const SAVE_FAILED = "Enregistrement impossible.";

/** Auto-save the current lesson's note, from the lesson's drawer. An empty note is deleted. */
export async function saveNoteAction(input: {
  lessonId: string;
  content: string;
}): Promise<SaveNoteResult> {
  const user = await requireRequestUser();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Note invalide." };

  try {
    const wordCount = countNoteWords(parsed.data.content);
    const saved = await noteRepository.upsert(
      user.id,
      parsed.data.lessonId,
      parsed.data.content,
      wordCount,
    );
    if (saved === null && parsed.data.content.trim() !== "") {
      return { ok: false, error: `Tu as atteint ${String(NOTES_MAX)} notes : vide la corbeille.` };
    }
    return {
      ok: true,
      wordCount: saved?.wordCount ?? 0,
      savedAt: (saved?.updatedAt ?? new Date()).toISOString(),
      noteId: saved?.id,
    };
  } catch (err) {
    logger.error({ scope: "notes", err: errorMessage(err) }, "lesson note save failed");
    return { ok: false, error: SAVE_FAILED };
  }
}

export type CreateNoteResult = { ok: true; note: SerializedNote } | { ok: false; error: string };

/** Create a note in the library: free, or on a lesson the user may open. */
export async function createNoteAction(input: {
  title: string;
  content?: string;
  folderId: string | null;
  lessonId?: string | null;
}): Promise<CreateNoteResult> {
  const user = await requireRequestUser();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Note invalide." };
  const title = cleanNoteTitle(parsed.data.title) || "Nouvelle note";
  const content = parsed.data.content ?? "";
  try {
    const res = await noteRepository.create(user.id, {
      title,
      content,
      wordCount: countNoteWords(content),
      folderId: parsed.data.folderId,
      lessonId: parsed.data.lessonId ?? null,
    });
    if (!res.ok) {
      const error = {
        limit: `Tu as atteint ${String(NOTES_MAX)} notes : vide la corbeille pour en créer d'autres.`,
        folder: "Ce dossier n'existe plus.",
        lesson: "Cette leçon n'est pas accessible.",
        taken: "Tu as déjà une note sur cette leçon.",
      }[res.reason];
      return { ok: false, error };
    }
    return { ok: true, note: serializeNote(res.note) };
  } catch (err) {
    logger.error({ scope: "notes", err: errorMessage(err) }, "note create failed");
    return { ok: false, error: "Création impossible." };
  }
}

/** Save a note's content from the workspace editor. Emptying it keeps the note. */
export async function updateNoteContentAction(input: {
  noteId: string;
  content: string;
}): Promise<SaveNoteResult> {
  const user = await requireRequestUser();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Note invalide." };
  try {
    const saved = await noteRepository.updateContent(
      user.id,
      parsed.data.noteId,
      parsed.data.content,
      countNoteWords(parsed.data.content),
    );
    if (!saved) return { ok: false, error: "Cette note n'existe plus." };
    return { ok: true, wordCount: saved.wordCount, savedAt: saved.updatedAt.toISOString() };
  } catch (err) {
    logger.error({ scope: "notes", err: errorMessage(err) }, "note save failed");
    return { ok: false, error: SAVE_FAILED };
  }
}

/** Rename a note. An empty title is refused rather than stored. */
export async function renameNoteAction(input: {
  noteId: string;
  title: string;
}): Promise<{ ok: boolean; title?: string }> {
  const user = await requireRequestUser();
  const parsed = renameSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const title = cleanNoteTitle(parsed.data.title);
  if (!title) return { ok: false };
  const ok = await noteRepository.rename(user.id, parsed.data.noteId, title);
  return ok ? { ok, title } : { ok };
}

/** Pin a note at the top of the lists, or unpin it. */
export async function pinNoteAction(input: {
  noteId: string;
  pinned: boolean;
}): Promise<{ ok: boolean }> {
  const user = await requireRequestUser();
  const parsed = pinSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  return { ok: await noteRepository.setPinned(user.id, parsed.data.noteId, parsed.data.pinned) };
}

/** Move notes into a folder, or out of any folder (folderId null). */
export async function moveNotesAction(input: {
  noteIds: string[];
  folderId: string | null;
}): Promise<{ ok: boolean; moved: number }> {
  const user = await requireRequestUser();
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, moved: 0 };
  const moved = await noteRepository.moveManyToFolder(
    user.id,
    parsed.data.noteIds,
    parsed.data.folderId,
  );
  return { ok: moved > 0, moved };
}

export type AttachNoteResult =
  | { ok: true; status: "attached" | "merged"; note: SerializedNote }
  | { ok: false; status: "conflict"; existingNoteId: string }
  | { ok: false; status: "error"; error: string };

/**
 * Tie a note to a lesson. When the user already has a note there, "attach"
 * reports the conflict and "merge" appends this note to that one.
 */
export async function attachNoteAction(input: {
  noteId: string;
  lessonId: string;
  mode: "attach" | "merge";
}): Promise<AttachNoteResult> {
  const user = await requireRequestUser();
  const parsed = attachSchema.safeParse(input);
  if (!parsed.success) return { ok: false, status: "error", error: "Demande invalide." };
  const res = await noteRepository.attachToLesson(
    user.id,
    parsed.data.noteId,
    parsed.data.lessonId,
    parsed.data.mode,
  );
  if (res.status === "not-found") {
    return { ok: false, status: "error", error: "Note ou leçon introuvable." };
  }
  if (res.status === "conflict") {
    return { ok: false, status: "conflict", existingNoteId: res.existingNoteId };
  }
  const note = await noteRepository.findOwned(user.id, res.noteId);
  if (!note) return { ok: false, status: "error", error: "Note introuvable." };
  return { ok: true, status: res.status, note: serializeNote(note) };
}

/** Untie a note from its lesson: it stays, free. */
export async function detachNoteAction(input: { noteId: string }): Promise<{ ok: boolean }> {
  const user = await requireRequestUser();
  const parsed = noteIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const ok = await noteRepository.detachFromLesson(user.id, parsed.data.noteId);
  return { ok };
}

/** Move notes to the trash (NOTE_TRASH_DAYS before they are purged). */
export async function trashNotesAction(input: {
  noteIds: string[];
}): Promise<{ ok: boolean; count: number }> {
  const user = await requireRequestUser();
  const parsed = z.object({ noteIds: idsSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, count: 0 };
  const count = await noteRepository.trash(user.id, parsed.data.noteIds);
  return { ok: count > 0, count };
}

/** Take notes out of the trash. */
export async function restoreNotesAction(input: { noteIds: string[] }): Promise<{
  ok: boolean;
  notes: SerializedNote[];
  /** Ids that came back without their lesson (gone, or holding another note). */
  freed: string[];
}> {
  const user = await requireRequestUser();
  const parsed = z.object({ noteIds: idsSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, notes: [], freed: [] };
  const { restored, freed } = await noteRepository.restore(user.id, parsed.data.noteIds);
  const notes = await Promise.all(restored.map((id) => noteRepository.findOwned(user.id, id)));
  return {
    ok: restored.length > 0,
    notes: notes.filter((n) => n !== null).map(serializeNote),
    freed,
  };
}

/** Delete trashed notes for good. */
export async function purgeNotesAction(input: {
  noteIds: string[];
}): Promise<{ ok: boolean; count: number }> {
  const user = await requireRequestUser();
  const parsed = z.object({ noteIds: idsSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, count: 0 };
  const count = await noteRepository.purge(user.id, parsed.data.noteIds);
  return { ok: count > 0, count };
}

/** Empty the whole trash. */
export async function emptyTrashAction(): Promise<{ ok: boolean; count: number }> {
  const user = await requireRequestUser();
  const count = await noteRepository.emptyTrash(user.id);
  return { ok: true, count };
}

/** Lessons the user may open, by title, for the attach picker. */
export async function searchLessonsForNoteAction(input: {
  q: string;
}): Promise<{ id: string; slug: string; title: string; category: string }[]> {
  const user = await requireRequestUser();
  const parsed = lessonQuerySchema.safeParse(input);
  if (!parsed.success) return [];
  return lessonRepository.searchReadableTitles(user.id, parsed.data.q, 12);
}

/** A card's key: the hash of its question, folded, so the answer can change. */
function cardKey(front: string): string {
  return createHash("sha256").update(normalizeNoteTitle(front)).digest("hex");
}

export type SyncCardsResult =
  | { ok: true; added: number; updated: number; removed: number; total: number }
  | { ok: false; error: string };

/**
 * Turn the note's `question :: réponse` lines into review cards. The note is
 * read from the database, not from the client: the deck matches what is saved.
 */
export async function syncNoteCardsAction(input: { noteId: string }): Promise<SyncCardsResult> {
  const user = await requireRequestUser();
  const parsed = noteIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Demande invalide." };
  const note = await noteRepository.findOwned(user.id, parsed.data.noteId);
  if (!note || note.deletedAt) return { ok: false, error: "Note introuvable." };
  const cards = extractFlashcards(note.content);
  if (cards.length > NOTE_CARDS_PER_NOTE_MAX) {
    return {
      ok: false,
      error: `${String(NOTE_CARDS_PER_NOTE_MAX)} cartes au plus par note (${String(cards.length)} trouvées).`,
    };
  }
  const res = await noteCardRepository.syncForNote(
    user.id,
    note.id,
    cards.map((c) => ({
      key: cardKey(c.front),
      front: c.front.slice(0, 500),
      back: c.back.slice(0, 2000),
    })),
    new Date(),
  );
  if (!res) return { ok: false, error: "Note introuvable." };
  return { ok: true, ...res, total: cards.length };
}
