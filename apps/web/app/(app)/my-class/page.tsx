import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { classRepository, prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { StudentClass } from "./_components/student-class";
import { TeacherClasses, type TaughtEstablishment } from "./_components/teacher-classes";

export const metadata: Metadata = { title: "Ma classe" };
export const dynamic = "force-dynamic";

const WEEK_MS = 7 * 86_400_000;

/**
 * The class page, for both sides of a class.
 *
 * It used to be one view shown to both: a list of names, which is a teacher's
 * view of a class with the teaching taken out of it. The two readers are asking
 * different questions - a student wants to know where they stand and who to ask
 * when stuck, a teacher wants to know who has stalled - so they get different
 * pages, and someone who is both gets both sections.
 *
 * There is still no role check. Teaching a class and being in one are facts
 * about the class tables, and both queries are scoped by the caller's own id,
 * so a role would only ever be a second and less reliable way of asking the
 * same question.
 *
 * Read-only by design: a class is composed in the admin console, not here.
 */
export default async function MyClassPage(): Promise<React.ReactElement> {
  const authUser = await requireRequestUser();

  const [taught, memberships] = await Promise.all([
    classRepository.findForTeacher(authUser.id),
    classRepository.findForMember(authUser.id),
  ]);

  // No class either way, no page. An empty shell saying so is a page that
  // exists only to say it has nothing, and the sidebar entry leading to it
  // would then say the same thing twice.
  if (taught.length === 0 && memberships.length === 0) notFound();

  const taughtClassIds = taught.flatMap((e) =>
    e.promotions.flatMap((p) => p.classes.map((c) => c.id)),
  );
  const readableClassIds = [...new Set([...taughtClassIds, ...memberships.map((m) => m.id)])];

  // One grouped count for every class at once rather than a query per class.
  const progress = await prisma.userLessonProgress.groupBy({
    by: ["userId"],
    where: {
      status: "COMPLETED",
      user: { classMemberships: { some: { classId: { in: readableClassIds } } } },
    },
    _count: { lessonId: true },
  });
  const completedByUser = new Map(progress.map((p) => [p.userId, p._count.lessonId]));

  // One roster read per class the viewer can see, taught or joined - the two
  // views want the same rows, and reading them twice would be paying for the
  // same join to answer the same question.
  const rosters = new Map(
    await Promise.all(
      readableClassIds.map(
        async (id) => [id, await classRepository.findMembersVisibleTo(id, authUser.id)] as const,
      ),
    ),
  );

  const establishments = buildTaught(taught, rosters, completedByUser);
  const isTeacher = taughtClassIds.length > 0;
  const classCount = taughtClassIds.length;

  return (
    <div className="page-container">
      <PageHeader
        crumb="ma-classe"
        eyebrow={
          isTeacher ? (
            <>
              SUIVI · <b>{classCount}</b> CLASSE{classCount > 1 ? "S" : ""}
            </>
          ) : (
            <>
              CLASSE · <b>{memberships[0]?.promotion.establishment.name ?? ""}</b>
            </>
          )
        }
        title={isTeacher ? "Mes classes" : "Ma classe"}
        lede={
          isTeacher
            ? "La progression de tes élèves, du moins avancé au plus avancé. La composition des classes est gérée par l'administration."
            : "Ta classe, tes professeurs et où tu en es par rapport au reste du groupe."
        }
      />

      {/* Their own enrolment first. Someone who is both is a teacher taking a
          course, and their own class is the part that concerns them rather
          than their pupils'. */}
      {memberships.length > 0 && (
        <div className="cls-stack" style={{ marginBottom: isTeacher ? 56 : 0 }}>
          {memberships.map((m) => {
            const roster = rosters.get(m.id);
            if (roster === undefined || roster === null) return null;
            return (
              <StudentClass
                key={m.id}
                userId={authUser.id}
                heading={{
                  id: m.id,
                  name: m.name,
                  establishment: m.promotion.establishment.name,
                  promotion: m.promotion.name,
                }}
                teachers={roster.teachers.map((t) => ({
                  id: t.teacher.id,
                  name: t.teacher.displayName || (t.teacher.username ?? "—"),
                  subject: t.subject,
                }))}
                people={roster.members.map((mem) => {
                  const visible = mem.user.preferences?.publicProfile !== false;
                  return {
                    id: mem.user.id,
                    name: visible ? mem.user.displayName || (mem.user.username ?? "—") : "Anonyme",
                    username: visible ? mem.user.username : null,
                    visible,
                    level: mem.user.level,
                    xpTotal: mem.user.xpTotal,
                    completed: completedByUser.get(mem.user.id) ?? 0,
                  };
                })}
              />
            );
          })}
        </div>
      )}

      {isTeacher && <TeacherClasses establishments={establishments} />}
    </div>
  );
}

/**
 * Turns the teacher's class tree into the shape the view renders.
 *
 * The rosters come from findMembersVisibleTo, which is scoped by the caller's
 * own membership or teaching - so a class id that is not theirs returns nothing
 * rather than someone else's students.
 */
function buildTaught(
  taught: Awaited<ReturnType<typeof classRepository.findForTeacher>>,
  rosters: Map<string, Awaited<ReturnType<typeof classRepository.findMembersVisibleTo>>>,
  completedByUser: Map<string, number>,
): TaughtEstablishment[] {
  const activeSince = Date.now() - WEEK_MS;

  return taught.map((e) => ({
    id: e.id,
    name: e.name,
    city: e.city,
    promotions: e.promotions.map((p) => ({
      id: p.id,
      name: p.name,
      startYear: p.startYear,
      classes: p.classes.map((c) => ({
        id: c.id,
        name: c.name,
        students: (rosters.get(c.id)?.members ?? []).map((m) => ({
          id: m.user.id,
          name: m.user.displayName || (m.user.username ?? "—"),
          username: m.user.username,
          level: m.user.level,
          completed: completedByUser.get(m.user.id) ?? 0,
          activeThisWeek: m.user.lastActiveAt.getTime() >= activeSince,
        })),
      })),
    })),
  }));
}
