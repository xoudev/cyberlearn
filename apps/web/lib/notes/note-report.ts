import { z } from "zod";
import { NOTE_REPORT_REASONS, noteReportRepository } from "@cyberlearn/db";
import { NOTE_REPORT_COMMENT_MAX } from "@cyberlearn/lib/notes/report-reasons";

export const noteReportSchema = z.object({
  noteId: z.string().uuid(),
  reason: z.enum(NOTE_REPORT_REASONS),
  comment: z.string().trim().max(NOTE_REPORT_COMMENT_MAX).optional(),
});

export type NoteReportResult = { ok: true } | { ok: false; error: string };

/** Reports a person may file or change in an hour: a handful of notes reach anybody. */
export const NOTE_REPORTS_PER_HOUR = 20;

/**
 * A recipient reporting a note somebody shared with them, on the site and in
 * the app. The note leaves their "Reçues" in the same step, as a dismiss would.
 *
 * Only a recipient can report: the repository checks the share, inside the
 * transaction that writes the report. Nothing reaches the author - no
 * moderation event, no flag - until the team has read it.
 *
 * Callers are responsible for AUTHENTICATION: `userId` must be a verified
 * identity (server action session or mobile Bearer JWT). Lives outside any
 * "use server" module so it cannot be invoked with an arbitrary userId.
 */
export async function reportSharedNoteFor(
  userId: string,
  input: unknown,
): Promise<NoteReportResult> {
  const parsed = noteReportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Signalement invalide." };
  const { noteId, reason } = parsed.data;
  const comment =
    parsed.data.comment === undefined || parsed.data.comment === "" ? null : parsed.data.comment;

  const recent = await noteReportRepository.countSince(
    userId,
    new Date(Date.now() - 60 * 60 * 1000),
  );
  if (recent >= NOTE_REPORTS_PER_HOUR) {
    return { ok: false, error: "Beaucoup de signalements d'un coup : réessaie dans une heure." };
  }

  const reported = await noteReportRepository.report(userId, noteId, reason, comment);
  if (!reported) return { ok: false, error: "Cette note n'est plus partagée avec toi." };
  return { ok: true };
}
