import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATALOGUE_LESSON, prisma } from "@cyberlearn/db";
import { EditPathClient } from "./_components/EditPathClient";

export const metadata: Metadata = { title: "Éditer le parcours" };

export default async function EditPathPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;

  const [path, availableLessons] = await Promise.all([
    prisma.path.findUnique({
      where: { id },
      select: {
        id: true,
        refCode: true,
        slug: true,
        title: true,
        description: true,
        category: true,
        track: true,
        difficulty: true,
        estimatedHours: true,
        coverImageUrl: true,
        status: true,
        lessons: {
          orderBy: { position: "asc" },
          select: {
            position: true,
            lesson: {
              select: {
                id: true,
                refCode: true,
                title: true,
                category: true,
                difficulty: true,
                estimatedMinutes: true,
                xpReward: true,
              },
            },
          },
        },
      },
    }),
    prisma.lesson.findMany({
      // CATALOGUE_LESSON, not just published: a lesson a teacher wrote for one
      // class is published, and putting it behind a badge or inside a path
      // would promise it to people who cannot open it.
      where: CATALOGUE_LESSON,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        refCode: true,
        title: true,
        category: true,
        difficulty: true,
        estimatedMinutes: true,
        xpReward: true,
      },
    }),
  ]);

  if (!path) notFound();

  const currentLessons = path.lessons.map((pl) => pl.lesson);

  return (
    <EditPathClient
      path={{
        id: path.id,
        refCode: path.refCode,
        slug: path.slug,
        title: path.title,
        description: path.description,
        category: path.category,
        track: path.track,
        difficulty: path.difficulty,
        estimatedHours: path.estimatedHours,
        coverImageUrl: path.coverImageUrl ?? "",
        status: path.status,
      }}
      currentLessons={currentLessons}
      availableLessons={availableLessons}
    />
  );
}
