"use server";

import { requireRequestUser } from "@/lib/auth";
import {
  shareAudienceFor,
  shareNoteFor,
  unshareNoteFor,
  type ShareAudienceState,
  type ShareNoteResult,
} from "@/lib/notes/note-share";

/**
 * The site's entry points for sharing a note: the session, then the service
 * the app uses too (@/lib/notes/note-share).
 */

export type {
  ShareAudienceEntry,
  ShareAudienceState,
  ShareNoteResult,
} from "@/lib/notes/note-share";

/** Who this note can go to, and who already has it. */
export async function loadShareAudienceAction(noteId: string): Promise<ShareAudienceState> {
  const user = await requireRequestUser();
  return shareAudienceFor(user.id, noteId);
}

export async function shareNoteAction(input: {
  noteId: string;
  recipientIds: string[];
}): Promise<ShareNoteResult> {
  const user = await requireRequestUser();
  return shareNoteFor(user.id, input);
}

/** Takes the note back from one person. */
export async function unshareNoteAction(
  noteId: string,
  recipientId: string,
): Promise<{ ok: boolean }> {
  const user = await requireRequestUser();
  return unshareNoteFor(user.id, noteId, recipientId);
}
