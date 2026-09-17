import { prisma } from "@cyberlearn/db";
import { type AssignedWorkKind, sendWorkAssignedEmail } from "@cyberlearn/email";
import { env } from "@/lib/env";

/**
 * Tells a class that work has been set for them.
 *
 * Two channels, answering to different rules - the same split the enrolment
 * notice already uses. The in-app notification always goes out: it is a record
 * of something that happened to their account, it costs nothing, and it is what
 * the bell is for. The e-mail is subject to emailNotifications, because an
 * unsolicited e-mail is the thing people actually object to.
 *
 * The bell alone was not enough, which is what this exists to fix: it announces
 * the work to people who are already on the site, and the ones who most need
 * telling are exactly the ones who are not. A deadline nobody saw is a deadline
 * nobody meets.
 *
 * Never throws. Work that is set is set; what can fail here is the telling, and
 * a teacher should not see an error on an assignment that went through.
 */

const NOTIFICATION_TYPE = {
  lesson: "LESSON_ASSIGNED",
  path: "PATH_ASSIGNED",
} as const;

export interface WorkAssignedNotice {
  classId: string;
  className: string;
  kind: AssignedWorkKind;
  workTitle: string;
  /** Relative, e.g. "/lessons/le-slug". */
  workPath: string;
  teacherName: string;
  dueAt: Date | null;
  instructions: string | null;
}

/** Returns how many members were told, for the confirmation the teacher sees. */
export async function announceAssignedWork(notice: WorkAssignedNotice): Promise<number> {
  let told = 0;
  try {
    const members = await prisma.classMember.findMany({
      where: { classId: notice.classId },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            preferences: { select: { emailNotifications: true } },
          },
        },
      },
    });
    if (members.length === 0) return 0;

    const dueLabel =
      notice.dueAt === null
        ? null
        : new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(notice.dueAt);
    const noun = notice.kind === "lesson" ? "leçon" : "parcours";

    await prisma.notification.createMany({
      data: members.map((m) => ({
        userId: m.user.id,
        type: NOTIFICATION_TYPE[notice.kind],
        title: `Nouveau ${noun} à faire : ${notice.workTitle}`,
        body:
          dueLabel === null
            ? `Ton professeur t'a donné ce ${noun}.`
            : `Ton professeur t'a donné ce ${noun} · à rendre avant le ${dueLabel}.`,
        actionUrl: notice.workPath,
      })),
    });
    told = members.length;

    const workUrl = `${env.NEXT_PUBLIC_SITE_URL}${notice.workPath}`;
    await Promise.all(
      members.map(async (m) => {
        // Absent preferences means pre-onboarding, and the column defaults to
        // true - an account that has never expressed a choice is treated as
        // having made none, which is the default the schema states.
        if (m.user.preferences?.emailNotifications === false) return;
        try {
          await sendWorkAssignedEmail({
            apiKey: env.RESEND_API_KEY,
            from: env.RESEND_FROM_EMAIL,
            to: m.user.email,
            displayName: m.user.displayName,
            kind: notice.kind,
            workTitle: notice.workTitle,
            className: notice.className,
            teacherName: notice.teacherName,
            dueLabel,
            instructions: notice.instructions,
            workUrl,
            siteUrl: env.NEXT_PUBLIC_SITE_URL,
          });
        } catch (error) {
          // One bad address must not cost the other twenty-seven their e-mail.
          console.error("[work-assigned] e-mail failed for one recipient:", error);
        }
      }),
    );
  } catch (error) {
    console.error("[work-assigned] notice failed:", error);
  }
  return told;
}
