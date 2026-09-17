import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { classRepository } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { PathBuilder } from "../../../_components/path-builder";
import { pickableLessonsFor } from "../../pickable-lessons";

export const metadata: Metadata = { title: "Modifier un parcours" };
export const dynamic = "force-dynamic";

/**
 * Reopening a class path.
 *
 * canEditClassPath is what decides, not the author id: co-teachers share what
 * they build, and a teacher who leaves mid-term should not take the class's
 * path with them.
 */
export default async function EditClassPathPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const user = await requireRequestUser();
  const { id } = await params;

  const path = await classRepository.findClassPathForEdit(id);
  if (!path || !(await classRepository.canEditClassPath(user.id, id))) notFound();

  const klassName = path.classLinks[0]?.class.name ?? "cette classe";
  const lessons = await pickableLessonsFor(user.id);

  return (
    <div className="tle-page">
      <PageHeader
        crumb="my-class/edit-path"
        eyebrow={`Classe · ${klassName}`}
        title={path.title}
        lede="Réordonner ou retirer une leçon ne touche pas la progression de tes élèves sur les leçons elles-mêmes."
      />
      <PathBuilder
        mode="edit"
        pathId={path.id}
        pathSlug={path.slug}
        className={klassName}
        lessons={lessons}
        draft={{
          title: path.title,
          description: path.description,
          category: path.category,
          difficulty: path.difficulty,
          estimatedHours: path.estimatedHours,
          lessonIds: path.lessons.map((l) => l.lessonId),
        }}
      />
    </div>
  );
}
