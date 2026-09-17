import React from "react";
import type { Metadata } from "next";
import { prisma } from "@cyberlearn/db";
import { GhostLink, PageHeader, PrimaryLink } from "../_components/admin-ui";
import { LessonsTable, type LessonRow } from "./_components/lessons-table";

export const metadata: Metadata = { title: "Leçons" };

export default async function AdminLessonsPage(): Promise<React.ReactElement> {
  const lessons = await prisma.lesson.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      refCode: true,
      slug: true,
      title: true,
      category: true,
      difficulty: true,
      status: true,
      audience: true,
      xpReward: true,
      estimatedMinutes: true,
      createdAt: true,
      _count: {
        select: {
          progress: { where: { status: "COMPLETED" } },
          pathLessons: true,
        },
      },
    },
  });

  const publishedCount = lessons.filter((l) => l.status === "PUBLISHED").length;
  const draftCount = lessons.filter((l) => l.status === "DRAFT").length;

  const rows: LessonRow[] = lessons.map((l) => ({
    id: l.id,
    refCode: l.refCode,
    slug: l.slug,
    title: l.title,
    category: l.category,
    difficulty: l.difficulty,
    status: l.status as LessonRow["status"],
    xpReward: l.xpReward,
    estimatedMinutes: l.estimatedMinutes,
    audience: l.audience,
    completions: l._count.progress,
    pathLessonsCount: l._count.pathLessons,
  }));

  return (
    <main className="admin-page-content">
      <PageHeader
        eyebrow="Contenu"
        title={`Leçons (${String(lessons.length)})`}
        description={`${String(publishedCount)} publiée${publishedCount !== 1 ? "s" : ""} · ${String(draftCount)} brouillon${draftCount !== 1 ? "s" : ""}.`}
        actions={
          <>
            <GhostLink href="/lessons/import">Importer MDX</GhostLink>
            <PrimaryLink href="/lessons/new">Nouvelle leçon</PrimaryLink>
          </>
        }
      />

      <LessonsTable lessons={rows} />
    </main>
  );
}
