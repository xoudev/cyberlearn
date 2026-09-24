import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { classRepository, lessonsVisibleTo, prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { StudentClass } from "./_components/student-class";
import { StudentWork, type StudentWorkItem } from "./_components/student-work";
import { TeacherClasses, type TaughtEstablishment } from "./_components/teacher-classes";
import type { ClassWorkItem } from "./_components/class-work";
import type { ClassLessonRow } from "./_components/class-lessons";
import type { ClassPathRow } from "./_components/class-paths";
import type { ResourceAssignmentOption, TeacherResourceRow } from "./_components/class-resources";
import { StudentResources, type StudentResourceItem } from "./_components/student-resources";

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

  // ── The work set for every class in view ────────────────────────────────
  const assignments = await classRepository.listAssignments(readableClassIds);
  const rosterMemberIds = [
    ...new Set(
      readableClassIds.flatMap((id) => (rosters.get(id)?.members ?? []).map((m) => m.user.id)),
    ),
  ];
  const completions = await classRepository.findCompletions(rosterMemberIds, [
    ...new Set(assignments.map((a) => a.lessonId)),
  ]);

  const now = Date.now();
  const dayFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

  const workByClass = new Map<string, ClassWorkItem[]>();
  for (const a of assignments) {
    const members = (rosters.get(a.classId)?.members ?? []).map((m) => m.user.id);
    const list = workByClass.get(a.classId) ?? [];
    list.push({
      lessonId: a.lessonId,
      slug: a.lesson.slug,
      title: a.lesson.title,
      instructions: a.instructions,
      dueAt: a.dueAt?.toISOString() ?? null,
      // Formatted here: the server owns the locale, and a date crossing the
      // boundary as a string cannot be rendered differently on the two sides.
      dueLabel: a.dueAt === null ? null : dayFormat.format(a.dueAt),
      overdue: a.dueAt !== null && a.dueAt.getTime() < now,
      doneCount: members.filter((id) => completions.has(`${id}:${a.lessonId}`)).length,
      totalCount: members.length,
    });
    workByClass.set(a.classId, list);
  }

  // What a teacher may assign: the catalogue, plus the lessons written for the
  // classes they follow. Titles and categories only - the form needs to name a
  // lesson, not to render one.
  const lessons =
    taughtClassIds.length === 0
      ? []
      : (
          await prisma.lesson.findMany({
            where: lessonsVisibleTo(authUser.id),
            orderBy: { title: "asc" },
            select: { id: true, title: true, category: true },
          })
        ).map((l) => ({
          id: l.id,
          title: l.title,
          category: l.category,
          search: `${l.title} ${l.category}`.toLowerCase(),
        }));

  // The lessons each class has of its own.
  const classLessons = await classRepository.listClassLessons(taughtClassIds);
  const ownByClass = new Map<string, ClassLessonRow[]>();
  for (const l of classLessons) {
    const list = ownByClass.get(l.classId) ?? [];
    list.push({
      id: l.id,
      slug: l.slug,
      title: l.title,
      description: l.description,
      category: l.category,
      difficulty: l.difficulty,
      estimatedMinutes: l.estimatedMinutes,
      xpReward: l.xpReward,
      createdLabel: dayFormat.format(l.createdAt),
    });
    ownByClass.set(l.classId, list);
  }

  // The paths each class has of its own, built by a teacher rather than the
  // platform. Same shape as the lessons above and read the same way.
  const classPaths = await classRepository.listClassPaths(taughtClassIds);
  const pathsByClass = new Map<string, ClassPathRow[]>();
  for (const p of classPaths) {
    const list = pathsByClass.get(p.classId) ?? [];
    list.push({
      id: p.id,
      slug: p.slug,
      title: p.title,
      lessonCount: p.lessonCount,
      estimatedHours: p.estimatedHours,
      createdLabel: dayFormat.format(p.createdAt),
    });
    pathsByClass.set(p.classId, list);
  }

  // ── Corrigés and other material ─────────────────────────────────────────
  // Two reads, not one with a flag: a teacher sees everything they prepared,
  // a student only what has been released, and the two rules live apart so
  // neither can be handed the other's.
  const teacherResources = await classRepository.listResourcesForTeacher(taughtClassIds);
  const resourcesByClass = new Map<string, TeacherResourceRow[]>();
  for (const r of teacherResources) {
    const list = resourcesByClass.get(r.classId) ?? [];
    list.push({
      id: r.id,
      title: r.title,
      url: r.url,
      hasBody: r.body !== null && r.body.length > 0,
      releaseLabel: r.releasedAt === null ? null : dayFormat.format(r.releasedAt),
      released: r.releasedAt === null || r.releasedAt.getTime() <= now,
      afterCompletion: r.afterCompletion,
      assignmentTitle: r.assignment?.lesson.title ?? null,
    });
    resourcesByClass.set(r.classId, list);
  }

  const assignmentOptionsByClass = new Map<string, ResourceAssignmentOption[]>();
  for (const a of assignments) {
    if (!taughtClassIds.includes(a.classId)) continue;
    const list = assignmentOptionsByClass.get(a.classId) ?? [];
    list.push({ id: a.id, title: a.lesson.title });
    assignmentOptionsByClass.set(a.classId, list);
  }

  const myResources: StudentResourceItem[] = (
    await classRepository.listResourcesForStudent(
      authUser.id,
      memberships.map((m) => m.id),
    )
  ).map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    url: r.url,
    assignmentTitle: r.assignment?.lesson.title ?? null,
    createdLabel: dayFormat.format(r.createdAt),
  }));

  const establishments = buildTaught(
    taught,
    rosters,
    completedByUser,
    workByClass,
    ownByClass,
    pathsByClass,
    resourcesByClass,
    assignmentOptionsByClass,
  );

  const myWork: StudentWorkItem[] = assignments
    .filter((a) => memberships.some((m) => m.id === a.classId))
    .map((a) => ({
      lessonId: a.lessonId,
      slug: a.lesson.slug,
      title: a.lesson.title,
      estimatedMinutes: a.lesson.estimatedMinutes,
      instructions: a.instructions,
      dueAt: a.dueAt,
      done: completions.has(`${authUser.id}:${a.lessonId}`),
    }));
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

      {/* What they have been told to do, before who else is in the class:
          a deadline is the thing on this page that can be missed. */}
      <StudentWork items={myWork} />

      {/* After the work: a corrigé is read once the thing it corrects is
          understood to exist. */}
      <StudentResources items={myResources} />

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
                  name: t.teacher.displayName || (t.teacher.username ?? "Sans nom"),
                  subject: t.subject,
                }))}
                people={roster.members.map((mem) => {
                  const visible = mem.user.preferences?.publicProfile !== false;
                  return {
                    id: mem.user.id,
                    name: visible
                      ? mem.user.displayName || (mem.user.username ?? "Sans nom")
                      : "Anonyme",
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

      {isTeacher && <TeacherClasses establishments={establishments} lessons={lessons} />}
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
  workByClass: Map<string, ClassWorkItem[]>,
  ownByClass: Map<string, ClassLessonRow[]>,
  pathsByClass: Map<string, ClassPathRow[]>,
  resourcesByClass: Map<string, TeacherResourceRow[]>,
  assignmentOptionsByClass: Map<string, ResourceAssignmentOption[]>,
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
        work: workByClass.get(c.id) ?? [],
        ownLessons: ownByClass.get(c.id) ?? [],
        ownPaths: pathsByClass.get(c.id) ?? [],
        resources: resourcesByClass.get(c.id) ?? [],
        assignmentOptions: assignmentOptionsByClass.get(c.id) ?? [],
        students: (rosters.get(c.id)?.members ?? []).map((m) => ({
          id: m.user.id,
          name: m.user.displayName || (m.user.username ?? "Sans nom"),
          username: m.user.username,
          level: m.user.level,
          completed: completedByUser.get(m.user.id) ?? 0,
          activeThisWeek: m.user.lastActiveAt.getTime() >= activeSince,
        })),
      })),
    })),
  }));
}
