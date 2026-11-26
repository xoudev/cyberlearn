"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { messageRepository, notificationRepository, userRepository } from "@cyberlearn/db";
import { AUDIT_ACTION } from "@cyberlearn/db/audit-actions";
import { MESSAGE_BODY_MAX } from "@cyberlearn/lib/messages/rules";
import { TEAM_NOTICE_TITLE } from "@cyberlearn/lib/messages/team";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { requireAdminAction } from "@/lib/auth";
import { checkTeamMessageRateLimit } from "@/lib/rate-limit";

/**
 * Writing to a learner as the CyberLearn team: a message in their conversation
 * with the team (made the first time), which they read in the messages panel
 * with nothing to accept, and can answer there. The console's inbox
 * (/messages) holds the answers.
 *
 * The message also lands in their notifications, the same text: the app has
 * no messages screen yet (docs/MOBILE_PARITY.md), and somebody who only opens
 * the app would otherwise never see it.
 *
 * requireAdminAction (the ADMIN role from the database, a completed TOTP
 * challenge), Zod, a rate limit, and one audit row per message.
 */

export type TeamMessageResult = { ok: true; conversationId: string } | { ok: false; error: string };

const schema = z.object({
  userId: z.guid("Ce compte n'existe pas."),
  body: z
    .string("Le message manque.")
    .trim()
    .min(1, "Écris un message.")
    .max(
      MESSAGE_BODY_MAX,
      `Le message fait ${MESSAGE_BODY_MAX.toLocaleString("fr-FR")} caractères au plus.`,
    ),
});

export async function sendTeamMessageAction(input: unknown): Promise<TeamMessageResult> {
  const admin = await requireAdminAction();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Message invalide." };
  }
  const { userId, body } = parsed.data;

  let reachable: boolean;
  try {
    const account = await userRepository.findHandle(userId);
    if (account === null) return { ok: false, error: "Ce compte n'existe plus." };
    // The audience filter of the announcements leaves banned accounts out:
    // one account is the same question, asked of one id.
    reachable = (await userRepository.countForAudience({ kind: "USER", userId })) === 1;
  } catch (error) {
    logger.error({ scope: "team-messages", err: errorMessage(error) }, "account read failed");
    return { ok: false, error: "Le compte n'a pas pu être lu. Rien n'a été envoyé." };
  }
  if (!reachable) {
    return {
      ok: false,
      error: "Ce compte est banni : il ne peut pas lire de message. Rien n'a été envoyé.",
    };
  }

  if (!(await checkTeamMessageRateLimit(admin.id))) {
    return { ok: false, error: "Beaucoup de messages en une heure. Réessaie un peu plus tard." };
  }

  let conversationId: string;
  try {
    const sent = await messageRepository.sendFromTeam({ adminId: admin.id, userId, body });
    conversationId = sent.conversationId;
    await notificationRepository.createMany(
      [
        {
          userId,
          type: "ANNOUNCEMENT",
          title: TEAM_NOTICE_TITLE,
          body,
          actionUrl: null,
          // The message it carries: reading the notice is the message seen
          // (@cyberlearn/lib/messages/team), in the app as on the site.
          metadata: { teamConversationId: conversationId, messageId: sent.messageId },
        },
      ],
      {
        audit: {
          actorId: admin.id,
          action: AUDIT_ACTION.teamMessage.send,
          targetType: "User",
          targetId: userId,
          metadata: { conversationId, messageId: sent.messageId, length: body.length },
        },
      },
    );
  } catch (error) {
    logger.error({ scope: "team-messages", err: errorMessage(error) }, "team message failed");
    return { ok: false, error: "Le message n'a pas pu partir. Réessaie." };
  }

  revalidatePath("/messages");
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath(`/users/${userId}`);
  return { ok: true, conversationId };
}
