import { z } from "zod";
import {
  CONTENT_REPORT_REASONS,
  CONTENT_SURFACES,
  contentModerationRepository,
  contentReportRepository,
} from "@cyberlearn/db";
import { CONTENT_REPORT_COMMENT_MAX } from "@cyberlearn/lib/moderation/report-reasons";

const contentReportSchema = z.object({
  surface: z.enum(CONTENT_SURFACES),
  contentId: z.guid(),
  reason: z.enum(CONTENT_REPORT_REASONS),
  comment: z.string().trim().max(CONTENT_REPORT_COMMENT_MAX).optional(),
});

export type ContentReportResult = { ok: true } | { ok: false; error: string };

/** Reports a person may file or change in an hour, across every surface. */
export const CONTENT_REPORTS_PER_HOUR = 20;

/**
 * A learner reporting something somebody else published, on the site and in
 * the app: a forum message, a question or an answer under a lesson, a
 * challenge solution, a class resource.
 *
 * Only what the reporter can see can be reported, by the rules of the page
 * that shows it (the repository's `reportable`), and never their own: the
 * ids come from the client. Nothing reaches the author, and nothing is
 * hidden, until the team has read it in the console.
 *
 * Callers are responsible for AUTHENTICATION: `userId` must be a verified
 * identity (server action session or mobile Bearer JWT). Lives outside any
 * "use server" module so it cannot be invoked with an arbitrary userId.
 */
export async function reportContentFor(
  userId: string,
  input: unknown,
): Promise<ContentReportResult> {
  const parsed = contentReportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Signalement invalide." };
  const { surface, contentId, reason } = parsed.data;
  const comment =
    parsed.data.comment === undefined || parsed.data.comment === "" ? null : parsed.data.comment;

  const recent = await contentReportRepository.countSince(
    userId,
    new Date(Date.now() - 60 * 60 * 1000),
  );
  if (recent >= CONTENT_REPORTS_PER_HOUR) {
    return { ok: false, error: "Beaucoup de signalements d'un coup : réessaie dans une heure." };
  }

  const target = await contentModerationRepository.reportable(surface, contentId, userId);
  if (target === null) return { ok: false, error: "Ce contenu n'est plus disponible." };
  if (target.authorId === userId) {
    return { ok: false, error: "Tu ne peux pas signaler ce que tu as publié toi-même." };
  }

  await contentReportRepository.report({ reporterId: userId, surface, contentId, reason, comment });
  return { ok: true };
}
