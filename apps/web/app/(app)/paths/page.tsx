import React from "react";
import type { Metadata } from "next";
import { prisma } from "@cyberlearn/db";
import { PathsCollection } from "./_components/paths-collection";
import type { SerializedPath } from "./_components/paths-collection";
import { requireRequestUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Parcours" };

export default async function PathsPage(): Promise<React.ReactElement> {
  const authUser = await requireRequestUser();

  const [paths, userProgress] = await Promise.all([
    prisma.path.findMany({
      where: { status: "PUBLISHED" },
      include: {
        lessons: {
          include: { lesson: { select: { xpReward: true } } },
        },
      },
      orderBy: { publishedAt: "desc" },
    }),
    prisma.userPathProgress.findMany({
      where: { userId: authUser.id },
      select: { pathId: true, status: true },
    }),
  ]);

  // Build progress lookup
  const progressMap = new Map(userProgress.map((up) => [up.pathId, up.status]));

  // Count completed lessons per path for progress
  const completedLessonsByPath = await prisma.userLessonProgress.groupBy({
    by: ["lessonId"],
    where: {
      userId: authUser.id,
      status: "COMPLETED",
      lesson: { pathLessons: { some: {} } },
    },
    _count: { lessonId: true },
  });

  // Build lessonId → completed set
  const completedLessonIds = new Set(completedLessonsByPath.map((r) => r.lessonId));

  // Build serialized paths
  const serialized: SerializedPath[] = paths.map((path) => {
    const pathStatus = progressMap.get(path.id);
    let status: SerializedPath["status"] = "idle";
    if (pathStatus === "COMPLETED") status = "done";
    else if (pathStatus === "IN_PROGRESS") status = "inprog";

    const lessonCount = path.lessons.length;
    const xpTotal = path.lessons.reduce((sum, pl) => sum + pl.lesson.xpReward, 0);
    const progressDone = path.lessons.filter((pl) => completedLessonIds.has(pl.lessonId)).length;

    return {
      id: path.id,
      slug: path.slug,
      refCode: path.refCode,
      title: path.title,
      description: path.description,
      category: path.category,
      difficulty: path.difficulty,
      estimatedHours: path.estimatedHours,
      xpTotal,
      lessonCount,
      hasCert: path.certificateTemplate !== null,
      status,
      progressDone,
      progressTotal: lessonCount,
    } satisfies SerializedPath;
  });

  const inProgCount = serialized.filter((p) => p.status === "inprog").length;
  const doneCount = serialized.filter((p) => p.status === "done").length;
  const totalXp = serialized.reduce((sum, p) => sum + p.xpTotal, 0);
  const totalHours = serialized.reduce((sum, p) => sum + p.estimatedHours, 0);

  return (
    <PathsCollection
      paths={serialized}
      inProgCount={inProgCount}
      doneCount={doneCount}
      totalXp={totalXp}
      totalHours={totalHours}
    />
  );
}
