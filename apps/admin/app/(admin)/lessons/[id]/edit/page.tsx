import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@cyberlearn/db";
import { PageHeader, Tag } from "../../../_components/admin-ui";
import { CONTENT_STATUS } from "../../../_components/content-status";
import { LESSON_CRUMBS } from "../../_components/lesson-headers";
import { EditLessonClient } from "./_components/edit-lesson-client";
import { learnerLessonUrlPrefix } from "@/lib/learner-url";
import { resolveLessonCoverSrc } from "@/lib/lesson-cover/storage";

import { requireAdminPage } from "@/lib/auth";
import { routeIdOrNotFound } from "@/lib/route-id";

export const metadata: Metadata = { title: "Éditer la leçon" };

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  await requireAdminPage();
  const id = routeIdOrNotFound((await params).id);

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: {
      id: true,
      refCode: true,
      slug: true,
      title: true,
      description: true,
      category: true,
      difficulty: true,
      estimatedMinutes: true,
      xpReward: true,
      coverImageUrl: true,
      contentMdx: true,
      status: true,
    },
  });

  if (!lesson) notFound();

  const coverPreview = await resolveLessonCoverSrc(lesson.coverImageUrl);

  const status = CONTENT_STATUS[lesson.status];

  return (
    <main className="a-page">
      <PageHeader
        crumbs={LESSON_CRUMBS}
        title={lesson.title}
        description={
          <>
            <span className="a-mono">{lesson.refCode}</span> ·{" "}
            <Tag tone={status.tone}>{status.label}</Tag>
          </>
        }
      />
      <EditLessonClient
        lesson={lesson}
        coverPreview={coverPreview}
        lessonUrlPrefix={learnerLessonUrlPrefix()}
      />
    </main>
  );
}
