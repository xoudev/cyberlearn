import { classRepository, prisma } from "@cyberlearn/db";
import { sendClassInvitationEmail } from "@cyberlearn/email";
import { env } from "@/lib/env";
import { learnerUrl } from "./learner-url";

/**
 * Invites addresses that have no account yet, and mails the ones it created.
 *
 * Renewals are deliberately not mailed. Re-pasting a roster is how an
 * administrator adds the three students who were missing, and the seventeen
 * already invited should not get the same message a second time for it.
 *
 * Nothing here may undo the invitation. The rows are committed before a single
 * mail is attempted, and each failure is logged per recipient, so a Resend
 * outage costs the notices and not the places held - and one bad address cannot
 * cost the other nineteen theirs.
 */

/** Long enough to survive a school holiday, short enough to mean something. */
export const INVITATION_TTL_DAYS = 30;

export interface InvitationOutcome {
  invited: string[];
  renewed: string[];
  mailFailed: string[];
}

export async function inviteAndNotify(
  classId: string,
  emails: string[],
  invitedById: string,
): Promise<InvitationOutcome> {
  if (emails.length === 0) return { invited: [], renewed: [], mailFailed: [] };

  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 86_400_000);
  const { created, renewed } = await classRepository.inviteToClass(
    classId,
    emails,
    invitedById,
    expiresAt,
  );

  if (created.length === 0) return { invited: [], renewed, mailFailed: [] };

  const klass = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      name: true,
      promotion: { select: { name: true, establishment: { select: { name: true } } } },
    },
  });
  if (!klass) return { invited: created, renewed, mailFailed: created };

  const expiryLabel = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(expiresAt);
  const signUpUrl = learnerUrl("/register");
  const mailFailed: string[] = [];

  await Promise.all(
    created.map(async (email) => {
      try {
        await sendClassInvitationEmail({
          apiKey: env.RESEND_API_KEY,
          from: env.RESEND_FROM_EMAIL,
          to: email,
          className: klass.name,
          establishmentName: klass.promotion.establishment.name,
          promotionName: klass.promotion.name,
          email,
          expiresAt: expiryLabel,
          signUpUrl,
        });
      } catch (error) {
        mailFailed.push(email);
        console.error("[class-invitation] mail failed:", email, error);
      }
    }),
  );

  return { invited: created, renewed, mailFailed };
}
