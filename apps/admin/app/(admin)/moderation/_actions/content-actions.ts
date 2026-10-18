"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CONTENT_SURFACES, contentModerationRepository, type ContentGesture } from "@cyberlearn/db";
import { moderationNotice, type ModerationStage } from "@cyberlearn/lib";
import { CONTENT_NOTICE_SURFACE } from "@cyberlearn/lib/moderation/report-reasons";
import { requireAdminAction } from "@/lib/auth";

/**
 * A moderator's hand on published content, from the list of contents and from
 * the reports about one: hide it, show it again, delete it, or close its
 * reports and leave it as it is.
 *
 * The repository does each in one transaction with what goes with it: the
 * reports closed, the journal's row (moderation.content.hide, .restore,
 * .delete, moderation.report.dismiss) and the author's notice. A second
 * click, or a second moderator, changes nothing and is told so.
 */

export interface ContentActionState {
  ok?: boolean;
  /** What happened, for the moderator. */
  message?: string;
  error?: string;
}

const gestureSchema = z.object({
  surface: z.enum(CONTENT_SURFACES),
  contentId: z.guid(),
  gesture: z.enum(["hide", "restore", "delete"]),
});

const dismissSchema = z.object({
  surface: z.enum(CONTENT_SURFACES),
  contentId: z.guid(),
});

/** What the author is told, in the words of the screen's own notices. */
const STAGE: Record<ContentGesture, ModerationStage> = {
  hide: "hidden",
  restore: "restored",
  delete: "removed",
};

const DONE: Record<ContentGesture, string> = {
  hide: "Contenu masqué",
  restore: "Contenu réaffiché",
  delete: "Contenu supprimé",
};

const REFUSED = {
  NOT_FOUND: "Ce contenu n'existe plus.",
  UNCHANGED:
    "Rien n'a changé : ce contenu est déjà dans cet état, quelqu'un l'a peut-être traité entre-temps.",
  PENDING_REVIEW:
    "Ce contenu attend une décision dans la file de relecture du filtre : c'est là qu'il se traite.",
} as const;

function reportsLine(count: number): string {
  return count === 0
    ? ""
    : ` ${String(count)} signalement${count > 1 ? "s" : ""} classé${count > 1 ? "s" : ""}.`;
}

/** Every page that shows content or its reports, redrawn after a gesture or a refusal. */
function revalidateModeration(authorId: string | null): void {
  revalidatePath("/moderation");
  revalidatePath("/moderation/content");
  revalidatePath("/moderation/reports");
  if (authorId !== null) revalidatePath(`/users/${authorId}`);
}

export async function moderateContentAction(
  _prev: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const admin = await requireAdminAction();
  const parsed = gestureSchema.safeParse({
    surface: formData.get("surface"),
    contentId: formData.get("contentId"),
    gesture: formData.get("gesture"),
  });
  if (!parsed.success) return { error: "Paramètres invalides." };

  const { surface, contentId, gesture } = parsed.data;
  const notice = moderationNotice({
    stage: STAGE[gesture],
    surface: CONTENT_NOTICE_SURFACE[surface],
  });
  const result = await contentModerationRepository.apply({
    surface,
    id: contentId,
    gesture,
    actorId: admin.id,
    notice,
  });

  if (!result.ok) {
    revalidateModeration(null);
    return { error: REFUSED[result.reason] };
  }
  const author = result.content.author;
  revalidateModeration(author?.id ?? null);
  // An erased account has nobody to tell, and a moderator is not told about
  // their own message.
  const told = author !== null && author.id !== admin.id ? ", son auteur est prévenu." : ".";
  return { ok: true, message: `${DONE[gesture]}${told}${reportsLine(result.reportsClosed)}` };
}

export async function dismissContentReportsAction(
  _prev: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const admin = await requireAdminAction();
  const parsed = dismissSchema.safeParse({
    surface: formData.get("surface"),
    contentId: formData.get("contentId"),
  });
  if (!parsed.success) return { error: "Paramètres invalides." };

  const closed = await contentModerationRepository.dismissReports({
    surface: parsed.data.surface,
    id: parsed.data.contentId,
    actorId: admin.id,
  });
  revalidateModeration(null);
  return closed === 0
    ? { error: "Plus aucun signalement ouvert : quelqu'un les a peut-être déjà traités." }
    : { ok: true, message: `Classé sans suite.${reportsLine(closed)}` };
}
