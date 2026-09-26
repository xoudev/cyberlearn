import { z } from "zod";
import { noteShareRepository } from "@cyberlearn/db";
import { labelRules } from "@cyberlearn/lib";
import { announceModeration } from "@/lib/moderation/announce";

/**
 * Handing a note to a classmate or a friend.
 *
 * Thin on purpose: who may receive a note, what the screen says about it and
 * who gets told when it is refused all live in the repository, because a
 * second caller must not be able to share a note without passing them. What is
 * here is the shape of the input, and French for the answer.
 *
 * Shared by the site (share-actions) and the app (/api/mobile/notes/*), so a
 * note shared from a phone is screened, refused and announced exactly like one
 * shared from the site. Callers are responsible for AUTHENTICATION: `userId`
 * must be a verified identity, of an account that is not banned
 * (requireRequestUser on the site, userFromBearer in the app). Lives outside
 * any "use server" module so it cannot be invoked with an arbitrary userId.
 */

const uuid = z.string().uuid();
const shareSchema = z.object({
  noteId: uuid,
  // A class, not a mailing list. Twenty-five names is a big class; anything
  // past fifty is somebody scripting it.
  recipientIds: z.array(uuid).min(1).max(50),
});

export interface ShareAudienceEntry {
  id: string;
  name: string;
  avatarUrl: string | null;
  kind: "PEER" | "TEACHER" | "FRIEND";
  /** Stable key for the heading this person sits under. */
  groupId: string;
  /** What that heading reads. */
  groupLabel: string;
  /** Already holds this note. */
  holds: boolean;
}

export interface ShareAudienceState {
  entries: ShareAudienceEntry[];
  /** True when the author has neither a live class nor a friend. */
  noAudience: boolean;
}

/** Who this note can go to, and who already has it. */
export async function shareAudienceFor(
  userId: string,
  noteId: unknown,
): Promise<ShareAudienceState> {
  const note = uuid.safeParse(noteId);
  if (!note.success) return { entries: [], noAudience: true };

  const [audience, recipients] = await Promise.all([
    noteShareRepository.audienceFor(userId),
    noteShareRepository.listRecipients(userId, note.data),
  ]);
  const holders = new Set(recipients.map((r) => r.id));

  return {
    entries: audience.map((p) => ({
      id: p.id,
      name: p.displayName.trim() !== "" ? p.displayName : (p.username ?? "Sans nom"),
      avatarUrl: p.avatarUrl,
      kind: p.kind,
      groupId: p.groupId,
      groupLabel: p.groupLabel,
      holds: holders.has(p.id),
    })),
    noAudience: audience.length === 0,
  };
}

export interface ShareNoteResult {
  ok: boolean;
  /** How many people the note reached. */
  shared?: number;
  /** What to show when it did not go out. */
  error?: string;
}

export async function shareNoteFor(userId: string, input: unknown): Promise<ShareNoteResult> {
  const parsed = shareSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Sélection invalide." };

  const result = await noteShareRepository.share({
    authorId: userId,
    noteId: parsed.data.noteId,
    recipientIds: parsed.data.recipientIds,
  });

  if (result.ok) return { ok: true, shared: result.shared };

  if (result.reason === "BLOCKED") {
    // The author is told, which is the half that was missing: their share
    // simply did not happen, and without this the only sign was a red line
    // under a form they may have already closed.
    await announceModeration({
      userId,
      surface: "note.share",
      stage: "refused",
      excerpt: "",
    });
  }

  switch (result.reason) {
    case "BLOCKED": {
      // Said plainly, and without pretending it went nowhere. A student who is
      // told their teacher now knows can go and talk to them, which is the
      // point; a vague "erreur" would only teach them to try again.
      //
      // The reason is named for the same purpose. The screen now refuses on a
      // doubt as well as on a certainty, so "jugé inapproprié" is sometimes
      // simply wrong - two source links are not an insult - and somebody who
      // cannot tell which of the two happened cannot fix either.
      const labels = labelRules(result.rules);
      const reason = labels.length > 0 ? ` Motif : ${labels.join(", ")}.` : "";
      const teacher = result.teachersNotified > 0 ? " Ton professeur en a été informé." : "";
      return {
        ok: false,
        // The note is untouched, and saying so is what makes the refusal
        // affordable: there is something to do about it.
        error: `Partage refusé : la modération a signalé cette note.${reason}${teacher} La note reste la tienne, tu peux la modifier et la repartager.`,
      };
    }
    case "EMPTY":
      return { ok: false, error: "Cette note est vide." };
    case "NO_RECIPIENT":
      return { ok: false, error: "Choisis au moins une personne." };
    case "NOT_FOUND":
      return { ok: false, error: "Note introuvable." };
  }
}

/** Takes the note back from one person. */
export async function unshareNoteFor(
  userId: string,
  noteId: unknown,
  recipientId: unknown,
): Promise<{ ok: boolean }> {
  const note = uuid.safeParse(noteId);
  const recipient = uuid.safeParse(recipientId);
  if (!note.success || !recipient.success) return { ok: false };
  return { ok: await noteShareRepository.unshare(userId, note.data, recipient.data) };
}

/**
 * Takes a received note out of the reader's "Reçues", on the site and in the
 * app. Their own row only: the author keeps the note, and so does everybody
 * else it went to.
 */
export async function dismissSharedNoteFor(
  userId: string,
  noteId: unknown,
): Promise<{ ok: boolean }> {
  const note = uuid.safeParse(noteId);
  if (!note.success) return { ok: false };
  return { ok: await noteShareRepository.dismissReceived(userId, note.data) };
}

/** A note somebody handed to the reader, as the app receives it. */
export interface MobileIncomingNote {
  id: string;
  content: string;
  wordCount: number;
  updatedAt: string;
  sharedAt: string;
  lessonSlug: string;
  lessonTitle: string;
  lessonCategory: string;
  authorName: string;
}

/**
 * The notes other people handed to the reader, most recent first: the site's
 * "Reçues". The author's stored avatar value stays behind, as the site's
 * library does not draw it either.
 */
export async function sharedWithMeFor(userId: string): Promise<MobileIncomingNote[]> {
  const notes = await noteShareRepository.listSharedWithMe(userId);
  return notes.map((n) => ({
    id: n.id,
    content: n.content,
    wordCount: n.wordCount,
    updatedAt: n.updatedAt.toISOString(),
    sharedAt: n.sharedAt.toISOString(),
    lessonSlug: n.lessonSlug,
    lessonTitle: n.lessonTitle,
    lessonCategory: n.lessonCategory,
    authorName: n.authorName,
  }));
}
