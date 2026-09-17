import { type NextRequest, NextResponse } from "next/server";
import { classRepository, prisma } from "@cyberlearn/db";
import { userFromBearer } from "../_lib/auth";

/**
 * What a learner's class has set for them, for the mobile My class screen.
 *
 * Served by the API rather than by direct Supabase reads because the class
 * tables are scoped by membership in the repositories, and because "what is
 * still to do" is a join across assignments and the reader's own progress that
 * belongs on one side of the wire, not three round trips on the other.
 *
 * This route exists because the site now e-mails a student when work is set for
 * them. An e-mail that says "tu as une leçon à rendre" and an app with nowhere
 * to show it is worse than not having sent the e-mail.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  try {
    const memberships = await classRepository.findForMember(user.id);
    if (memberships.length === 0) {
      return NextResponse.json({ ok: true, classes: [], work: [] });
    }

    const classIds = memberships.map((m) => m.id);
    const assignments = await classRepository.listAssignments(classIds);

    const completions = await prisma.userLessonProgress.findMany({
      where: {
        userId: user.id,
        status: "COMPLETED",
        lessonId: { in: assignments.map((a) => a.lessonId) },
      },
      select: { lessonId: true },
    });
    const done = new Set(completions.map((c) => c.lessonId));

    return NextResponse.json({
      ok: true,
      classes: memberships.map((m) => ({
        id: m.id,
        name: m.name,
        establishment: m.promotion.establishment.name,
        promotion: m.promotion.name,
        teachers: m.teachers.map((t) => ({
          name: t.teacher.displayName || (t.teacher.username ?? "—"),
          subject: t.subject,
        })),
        memberCount: m._count.members,
      })),
      // Dates cross the wire as ISO strings; the app formats them, because a
      // Date does not survive JSON and a pre-formatted label would freeze the
      // server's locale onto a device that may not share it.
      work: assignments.map((a) => ({
        lessonId: a.lessonId,
        slug: a.lesson.slug,
        title: a.lesson.title,
        estimatedMinutes: a.lesson.estimatedMinutes,
        instructions: a.instructions,
        dueAt: a.dueAt?.toISOString() ?? null,
        done: done.has(a.lessonId),
      })),
    });
  } catch (error) {
    console.error("[api/mobile/my-class] failed:", error);
    return NextResponse.json({ ok: false, error: "Erreur serveur." }, { status: 500 });
  }
}
