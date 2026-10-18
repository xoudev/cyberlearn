"use server";

import { requireRequestUser } from "@/lib/auth";
import { reportContentFor, type ContentReportResult } from "@/lib/moderation/content-report";

/**
 * The site's « Signaler » on what others publish (forum, lesson questions and
 * answers, solutions, class resources): the session, then the service the
 * app uses too (@/lib/moderation/content-report), which validates the input.
 */
export async function reportContentAction(input: {
  surface: string;
  contentId: string;
  reason: string;
  comment?: string;
}): Promise<ContentReportResult> {
  const user = await requireRequestUser();
  return reportContentFor(user.id, input);
}
