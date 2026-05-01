import React from "react";
import { prisma } from "@cyberlearn/db";
import { NewPathClient } from "./_components/NewPathClient";

export const dynamic = "force-dynamic";

export default async function NewPathPage(): Promise<React.ReactElement> {
  const lessons = await prisma.lesson.findMany({
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
  });

  return <NewPathClient availableLessons={lessons} />;
}
