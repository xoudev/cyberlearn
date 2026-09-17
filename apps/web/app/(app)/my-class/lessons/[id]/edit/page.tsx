import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { classRepository } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { LessonEditor } from "../../../_components/lesson-editor";

export const metadata: Metadata = { title: "Modifier une leçon" };
export const dynamic = "force-dynamic";

/**
 * Reopening a class lesson.
 *
 * Until now a teacher could write one and delete it, and nothing in between:
 * the update action existed with no way to reach it, so a typo in a lesson a
 * class was already working through could only be fixed by deleting it - which
 * takes their progress with it.
 *
 * canEditClassLesson is what decides, not the author id: co-teachers share the
 * material, and a teacher who leaves mid-term should not take it with them.
 */
export default async function EditClassLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const user = await requireRequestUser();
  const { id } = await params;

  const lesson = await classRepository.findClassLessonForEdit(id);
  if (!lesson || !(await classRepository.canEditClassLesson(user.id, id))) notFound();

  const klassName = lesson.classLinks[0]?.class.name ?? "cette classe";

  return (
    <div className="tle-page">
      <PageHeader
        crumb="my-class/edit-lesson"
        eyebrow={`Classe · ${klassName}`}
        title={lesson.title}
        lede="Les modifications sont visibles tout de suite. La progression de tes élèves n'est pas touchée."
      />
      <LessonEditor
        mode="edit"
        lessonId={lesson.id}
        lessonSlug={lesson.slug}
        className={klassName}
        draft={{
          title: lesson.title,
          description: lesson.description,
          category: lesson.category,
          difficulty: lesson.difficulty,
          estimatedMinutes: lesson.estimatedMinutes,
          xpReward: lesson.xpReward,
          contentMdx: lesson.contentMdx,
        }}
      />
    </div>
  );
}
