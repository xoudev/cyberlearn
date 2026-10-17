"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  classRepository,
  notificationRepository,
  userRepository,
  type AnnouncementAudience,
} from "@cyberlearn/db";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import {
  ANNOUNCEMENT_ACTION,
  ANNOUNCEMENT_TARGET,
  announcementProblem,
  announcementSchema,
  announcementTrace,
  audienceLabel,
  sendAnnouncementSchema,
} from "@/lib/announcement";
import { requireAdminAction } from "@/lib/auth";
import { checkAnnouncementRateLimit } from "@/lib/rate-limit";

/**
 * Sending an announcement: an ANNOUNCEMENT notification to every account, the
 * accounts of some roles, or the members of some classes. It lands in the
 * bell on the site and in the app, and it cannot be taken back - so the form
 * asks for the count first, and the send carries the count it confirmed.
 *
 * Both actions go through requireAdminAction (the ADMIN role read from the
 * database, a completed TOTP challenge) and Zod, whatever the form sent.
 */

export type RecipientsResult = { ok: true; recipients: number } | { ok: false; error: string };

export type SendAnnouncementResult =
  | { ok: true; sent: number }
  | {
      ok: false;
      error: string;
      /** The count now, when it moved since the confirmation. */
      recipients?: number;
    };

const PATH = "/announcements";

/**
 * The audience in words, or why it cannot be sent to: a class chosen on the
 * page that was archived since is not a class anybody would expect to reach.
 */
async function resolveLabel(
  audience: AnnouncementAudience,
): Promise<{ ok: true; label: string } | { ok: false; error: string }> {
  if (audience.kind !== "CLASSES") return { ok: true, label: audienceLabel(audience, new Map()) };
  const live = new Map((await classRepository.listLiveOptions()).map((c) => [c.id, c.name]));
  if (audience.classIds.some((id) => !live.has(id))) {
    return {
      ok: false,
      error:
        "Une des classes choisies a été archivée ou supprimée entre-temps. Recharge la page et choisis de nouveau.",
    };
  }
  return { ok: true, label: audienceLabel(audience, live) };
}

/** How many accounts the announcement would reach, before anything is sent. */
export async function countAnnouncementRecipientsAction(input: unknown): Promise<RecipientsResult> {
  await requireAdminAction();
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: announcementProblem(parsed.error) };

  const label = await resolveLabel(parsed.data.audience);
  if (!label.ok) return label;

  try {
    const recipients = await userRepository.countForAudience(parsed.data.audience, new Date());
    if (recipients === 0) {
      return { ok: false, error: "Personne ne correspond à cette audience pour l'instant." };
    }
    return { ok: true, recipients };
  } catch (error) {
    logger.error({ scope: "announcements", err: errorMessage(error) }, "recipient count failed");
    return { ok: false, error: "Les destinataires n'ont pas pu être comptés. Réessaie." };
  }
}

/**
 * Sends the announcement to the audience, as confirmed. When the audience
 * has grown or shrunk since the count - an account created, a class filled -
 * nothing goes out: the administrator is shown the new figure to confirm,
 * rather than having agreed to one number and sent another.
 */
export async function sendAnnouncementAction(input: unknown): Promise<SendAnnouncementResult> {
  const admin = await requireAdminAction();
  const parsed = sendAnnouncementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: announcementProblem(parsed.error) };
  const { confirmedRecipients, ...announcement } = parsed.data;

  const label = await resolveLabel(announcement.audience);
  if (!label.ok) return label;

  let userIds: string[];
  try {
    userIds = await userRepository.idsForAudience(announcement.audience, new Date());
  } catch (error) {
    logger.error({ scope: "announcements", err: errorMessage(error) }, "audience read failed");
    return { ok: false, error: "Les destinataires n'ont pas pu être lus. Rien n'a été envoyé." };
  }

  if (userIds.length === 0) {
    return {
      ok: false,
      error: "Personne ne correspond plus à cette audience. Rien n'a été envoyé.",
      recipients: 0,
    };
  }
  if (userIds.length !== confirmedRecipients) {
    return {
      ok: false,
      error: `Le nombre de destinataires a changé depuis la confirmation : ${userIds.length.toLocaleString("fr-FR")} au lieu de ${confirmedRecipients.toLocaleString("fr-FR")}. Rien n'a été envoyé ; vérifie et confirme de nouveau.`,
      recipients: userIds.length,
    };
  }

  if (!(await checkAnnouncementRateLimit(admin.id))) {
    return {
      ok: false,
      error: "Trop d'annonces en une heure. Rien n'a été envoyé ; réessaie un peu plus tard.",
    };
  }

  const announcementId = randomUUID();
  try {
    const sent = await notificationRepository.createMany(
      userIds.map((userId) => ({
        userId,
        type: "ANNOUNCEMENT",
        title: announcement.title,
        body: announcement.body,
        actionUrl: announcement.actionUrl ?? null,
        metadata: { announcementId },
      })),
      {
        audit: {
          actorId: admin.id,
          action: ANNOUNCEMENT_ACTION,
          targetType: ANNOUNCEMENT_TARGET,
          targetId: announcementId,
          metadata: announcementTrace(announcement, label.label, userIds.length),
        },
      },
    );
    revalidatePath(PATH);
    return { ok: true, sent };
  } catch (error) {
    logger.error(
      { scope: "announcements", err: errorMessage(error), announcementId },
      "announcement failed",
    );
    return {
      ok: false,
      error: "L'annonce n'a pas pu être envoyée : personne ne l'a reçue. Réessaie.",
    };
  }
}
