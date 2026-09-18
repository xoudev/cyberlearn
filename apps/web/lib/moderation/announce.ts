import { moderationNotice, type ModerationStage } from "@cyberlearn/lib";
import { prisma } from "@cyberlearn/db";
import { sendModerationNoticeEmail } from "@cyberlearn/email";
import { env } from "@/lib/env";

/**
 * Tells somebody what the moderation did with what they wrote.
 *
 * Two channels, answering to different rules - the same split the class notices
 * use. The in-app notification always goes out: it is a record of something
 * that happened to their account, it costs nothing, and it is what the bell is
 * for. The e-mail is subject to emailNotifications, because an unsolicited
 * e-mail is the thing people actually object to.
 *
 * Both matter here, and for opposite reasons. Somebody on the site sees the
 * bell; somebody who posted and closed the tab is exactly the person who will
 * otherwise come back tomorrow, find nothing where their message was, and post
 * it again.
 *
 * Never throws. The decision is made either way, and a moderator should not see
 * an error on a queue row they have correctly closed.
 */

export interface ModerationAnnouncement {
  userId: string;
  surface: string;
  stage: ModerationStage;
  /** What was flagged, for the e-mail to quote. */
  excerpt: string;
  /** The sanction that came with a confirmed decision, in French, or null. */
  sanctionLabel?: string | null;
}

/** Where somebody reads their own moderation record. */
const RECORD_PATH = "/settings/moderation";

export async function announceModeration(input: ModerationAnnouncement): Promise<void> {
  try {
    const notice = moderationNotice({
      stage: input.stage,
      surface: input.surface,
      sanctionLabel: input.sanctionLabel ?? null,
    });

    const person = await prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        email: true,
        displayName: true,
        username: true,
        preferences: { select: { emailNotifications: true } },
      },
    });
    if (!person) return;

    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: "MODERATION_ALERT",
        title: notice.title,
        body: notice.body,
        actionUrl: RECORD_PATH,
        metadata: { stage: input.stage, surface: input.surface },
      },
    });

    if (person.preferences?.emailNotifications === false) return;

    await sendModerationNoticeEmail({
      apiKey: env.RESEND_API_KEY,
      from: env.RESEND_FROM_EMAIL,
      to: person.email,
      displayName: person.displayName || (person.username ?? "toi"),
      title: notice.title,
      body: notice.body,
      excerpt: input.excerpt,
      recordUrl: `${env.NEXT_PUBLIC_SITE_URL}${RECORD_PATH}`,
      siteUrl: env.NEXT_PUBLIC_SITE_URL,
    });
  } catch (error) {
    console.error("[moderation] failed to announce:", error);
  }
}
