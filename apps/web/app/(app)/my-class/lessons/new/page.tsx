import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LIVE_CLASS_FILTER, classRepository, prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { LessonEditor } from "../../_components/lesson-editor";

export const metadata: Metadata = { title: "Écrire une leçon" };
export const dynamic = "force-dynamic";

/**
 * Writing a lesson for one class.
 *
 * The class arrives in the query string, which decides nothing on its own: the
 * page asks whether this account may set work for it, exactly as the action
 * behind the form does. The two checks are not redundant - this one decides
 * whether to draw the page, that one decides whether to write the row, and a
 * page that opens for a class the teacher does not follow is a bug even when
 * the submit would be refused.
 */
export default async function NewClassLessonPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}): Promise<React.ReactElement> {
  const user = await requireRequestUser();
  const { classId } = await searchParams;
  if (classId === undefined) notFound();

  if (!(await classRepository.canSetWorkFor(user.id, classId))) notFound();

  // The name only, for the caption. The roster read would answer this too, but
  // it fetches every member to do it, and an archived class has to fall away
  // here as it does everywhere else.
  const klass = await prisma.class.findFirst({
    where: { id: classId, ...LIVE_CLASS_FILTER },
    select: { name: true },
  });
  if (!klass) notFound();

  return (
    <div className="tle-page">
      <PageHeader
        crumb="my-class/new-lesson"
        eyebrow={`Classe · ${klass.name}`}
        title="Écrire une leçon"
        lede="Elle ne sera visible que par cette classe, et se comporte comme n'importe quelle autre leçon : progression, XP, révisions, et tu peux la donner avec une date."
      />
      <LessonEditor mode="create" classId={classId} className={klass.name} />
    </div>
  );
}
