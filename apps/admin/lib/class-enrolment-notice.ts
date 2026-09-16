import { prisma } from "@cyberlearn/db";
import { sendClassEnrolledEmail } from "@cyberlearn/email";
import { env } from "@/lib/env";

/**
 * Tells students they have been put in a class.
 *
 * Enrolment happens entirely in this console: an administrator pastes a list of
 * addresses and rows appear in class_members. Before this, the learner found out
 * the next time they happened to open their profile - the class panel was
 * already sitting there with their classmates on it, and nothing had said so.
 *
 * Two channels, and they answer to different rules. The in-app notification
 * always goes out: it is a record of something that happened to their account,
 * it costs nothing, and it is what the bell is for. The e-mail is subject to
 * emailNotifications, because an unsolicited e-mail is the thing people
 * actually object to.
 *
 * Nothing here may undo the enrolment. The membership is already committed when
 * this runs, and a Resend outage is not a reason to pretend a student is not in
 * a class - so every failure is logged and swallowed, per recipient, and one
 * bad address cannot cost the other nineteen their notice.
 */
export async function notifyEnrolledInClass(classId: string, userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;

  const [klass, users] = await Promise.all([
    prisma.class.findUnique({
      where: { id: classId },
      select: {
        name: true,
        promotion: {
          select: { name: true, establishment: { select: { name: true } } },
        },
        teachers: {
          orderBy: { assignedAt: "asc" },
          select: { teacher: { select: { displayName: true, username: true } } },
        },
      },
    }),
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        displayName: true,
        preferences: { select: { emailNotifications: true } },
      },
    }),
  ]);

  if (!klass) return;

  const establishmentName = klass.promotion.establishment.name;
  const promotionName = klass.promotion.name;
  const teacherNames = klass.teachers
    .map((t) => t.teacher.displayName || (t.teacher.username ?? ""))
    .filter((n) => n.length > 0);

  const body =
    teacherNames.length > 0
      ? `${establishmentName} · ${promotionName}. ${teacherNames.length > 1 ? "Professeurs" : "Professeur"} : ${teacherNames.join(", ")}.`
      : `${establishmentName} · ${promotionName}.`;

  try {
    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        type: "CLASS_ENROLLED" as const,
        title: `Tu as rejoint ${klass.name}`,
        body,
        actionUrl: "/profile",
      })),
    });
  } catch (error) {
    console.error("[class-enrolment] notifications failed:", error);
  }

  const profileUrl = `${env.NEXT_PUBLIC_SITE_URL}/profile`;

  await Promise.all(
    users.map(async (u) => {
      // Absent preferences means pre-onboarding, and the column defaults to
      // true - an account that has never expressed a choice is treated as
      // having made none, which is the default the schema states.
      if (u.preferences?.emailNotifications === false) return;
      try {
        await sendClassEnrolledEmail({
          apiKey: env.RESEND_API_KEY,
          from: env.RESEND_FROM_EMAIL,
          to: u.email,
          displayName: u.displayName,
          className: klass.name,
          establishmentName,
          promotionName,
          teacherNames,
          profileUrl,
        });
      } catch (error) {
        console.error("[class-enrolment] email failed for one recipient:", error);
      }
    }),
  );
}
