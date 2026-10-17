import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@cyberlearn/db";
import { PageHeader, Tag } from "../../../_components/admin-ui";
import { CONTENT_STATUS } from "../../../_components/content-status";
import { EditLessonClient } from "./_components/edit-lesson-client";
import { LessonPlacement, type LessonMembership } from "./_components/lesson-placement";
import { learnerLessonUrlPrefix } from "@/lib/learner-url";
import { resolveLessonCoverSrc } from "@/lib/lesson-cover/storage";
import { suggestLessonRefCode } from "@/lib/next-ref-code";

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
      audience: true,
      pathLessons: {
        select: {
          position: true,
          module: { select: { title: true } },
          path: { select: { id: true, refCode: true, title: true, status: true, audience: true } },
        },
      },
      prerequisites: { select: { prerequisiteId: true } },
    },
  });

  if (!lesson) notFound();

  const { pathLessons, prerequisites, audience, ...form } = lesson;
  const pathIds = pathLessons.map((link) => link.path.id);
  const prerequisiteIds = prerequisites.map((p) => p.prerequisiteId);

  const [coverPreview, ranks, pathOptions, lessonOptions, codes] = await Promise.all([
    resolveLessonCoverSrc(lesson.coverImageUrl),
    // The place among the path's lessons rather than the stored position: a
    // path the console saved before it numbered from 1 starts at 0.
    Promise.all(
      pathLessons.map((link) =>
        prisma.pathLesson.count({
          where: { pathId: link.path.id, position: { lt: link.position } },
        }),
      ),
    ),
    prisma.path.findMany({
      where: {
        audience: "CATALOGUE",
        OR: [{ status: { not: "ARCHIVED" } }, { id: { in: pathIds } }],
      },
      orderBy: { refCode: "asc" },
      select: { id: true, refCode: true, title: true, status: true },
    }),
    prisma.lesson.findMany({
      where: {
        NOT: { id },
        OR: [
          { audience: "CATALOGUE", status: { not: "ARCHIVED" } },
          { id: { in: prerequisiteIds } },
        ],
      },
      orderBy: { refCode: "asc" },
      select: { id: true, refCode: true, title: true },
    }),
    prisma.lesson.findMany({
      where: { refCode: { startsWith: "CL-LSN-" } },
      select: { refCode: true },
    }),
  ]);

  const memberships: LessonMembership[] = pathLessons
    .map((link, index) => ({
      pathId: link.path.id,
      refCode: link.path.refCode,
      title: link.path.title,
      status: link.path.status,
      isClassPath: link.path.audience !== "CATALOGUE",
      position: (ranks[index] ?? 0) + 1,
      moduleTitle: link.module?.title ?? null,
    }))
    .sort((a, b) => a.refCode.localeCompare(b.refCode));

  const suggestion = suggestLessonRefCode(
    lesson.refCode,
    memberships
      .filter((m) => !m.isClassPath)
      .map((m) => ({ pathRefCode: m.refCode, position: m.position, title: m.title })),
    codes.map((c) => c.refCode),
  );

  const status = CONTENT_STATUS[lesson.status];

  return (
    <main className="a-page">
      <PageHeader
        crumbs={[{ label: "Contenu" }, { label: "Leçons", href: "/lessons" }]}
        title={lesson.title}
        description={
          <>
            <span className="a-mono">{lesson.refCode}</span> ·{" "}
            <Tag tone={status.tone}>{status.label}</Tag>
          </>
        }
      />
      <div style={{ marginBottom: 24 }}>
        <LessonPlacement
          lessonId={lesson.id}
          isClassLesson={audience !== "CATALOGUE"}
          memberships={memberships}
          pathOptions={pathOptions}
          prerequisiteIds={prerequisiteIds}
          lessonOptions={lessonOptions}
        />
      </div>
      <EditLessonClient
        lesson={form}
        coverPreview={coverPreview}
        lessonUrlPrefix={learnerLessonUrlPrefix()}
        refCodeSuggestion={
          suggestion === null
            ? null
            : {
                refCode: suggestion.refCode,
                pathTitle: suggestion.from.title,
                position: suggestion.from.position,
              }
        }
      />
    </main>
  );
}
