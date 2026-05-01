import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@cyberlearn/db";
import { EditLessonClient } from "./_components/edit-lesson-client";

export const metadata: Metadata = { title: "Éditer la leçon" };

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;

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

  return <EditLessonClient lesson={lesson} />;
}
