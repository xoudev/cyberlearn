import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LIVE_CLASS_FILTER, classRepository, prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { PathBuilder } from "../../_components/path-builder";
import { pickableLessonsFor } from "../pickable-lessons";

export const metadata: Metadata = { title: "Créer un parcours" };
export const dynamic = "force-dynamic";

/**
 * Building a path for one class.
 *
 * The class arrives in the query string and decides nothing on its own: the
 * page asks whether this account may set work for it, exactly as the action
 * behind the form does. A page that opens for a class the teacher does not
 * follow is a bug even when the submit would be refused.
 */
export default async function NewClassPathPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}): Promise<React.ReactElement> {
  const user = await requireRequestUser();
  const { classId } = await searchParams;
  if (classId === undefined) notFound();

  if (!(await classRepository.canSetWorkFor(user.id, classId))) notFound();

  const klass = await prisma.class.findFirst({
    where: { id: classId, ...LIVE_CLASS_FILTER },
    select: { name: true },
  });
  if (!klass) notFound();

  const lessons = await pickableLessonsFor(user.id);

  return (
    <div className="tle-page">
      <PageHeader
        crumb="my-class/new-path"
        eyebrow={`Classe · ${klass.name}`}
        title="Créer un parcours"
        lede="Une suite de leçons dans l'ordre où tu veux qu'elles soient suivies. Visible par cette classe seulement."
      />
      <PathBuilder mode="create" classId={classId} className={klass.name} lessons={lessons} />
    </div>
  );
}
