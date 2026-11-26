import { sendTeamReplyEmail } from "@cyberlearn/email";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { env } from "@/lib/env";

/**
 * Tells the team a learner answered it: one e-mail to each recipient
 * messageRepository.teamReplyAlert chose, with the answer and the link to the
 * conversation in the console.
 *
 * Never in the way of the answer itself, which is already written: a failed
 * send is logged and the console's count still shows the conversation.
 */

const CONSOLE_FALLBACK = "https://admin.cyberlearn.fr";

/** "Ada (@ada)", or whichever of the two the account has. */
function learnerLabel(learner: { displayName: string; username: string | null }): string {
  const name = learner.displayName.trim();
  if (learner.username === null) return name !== "" ? name : "Un apprenant";
  return name !== "" ? `${name} (@${learner.username})` : `@${learner.username}`;
}

export async function alertTeamOfReply(input: {
  conversationId: string;
  reply: string;
  learner: { displayName: string; username: string | null };
  recipients: readonly { email: string; displayName: string }[];
}): Promise<void> {
  const consoleUrl = (env.NEXT_PUBLIC_ADMIN_URL ?? CONSOLE_FALLBACK).replace(/\/$/u, "");
  const label = learnerLabel(input.learner);
  await Promise.all(
    input.recipients.map(async (recipient) => {
      try {
        await sendTeamReplyEmail({
          apiKey: env.RESEND_API_KEY,
          from: env.RESEND_FROM_EMAIL,
          to: recipient.email,
          adminName: recipient.displayName.trim() !== "" ? recipient.displayName : "l'équipe",
          learnerLabel: label,
          reply: input.reply,
          conversationUrl: `${consoleUrl}/messages/${input.conversationId}`,
        });
      } catch (error) {
        logger.error(
          { scope: "messages", err: errorMessage(error), conversationId: input.conversationId },
          "team reply e-mail failed",
        );
      }
    }),
  );
}
