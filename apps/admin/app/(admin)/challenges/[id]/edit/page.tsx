import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@cyberlearn/db";
import { Card, PageHeader } from "../../../_components/admin-ui";
import { EditChallengeForm } from "./_components/edit-challenge-form";
import { HintsManager } from "./_components/hints-manager";
import type { ChallengeOption } from "../../new/_components/new-challenge-form";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Éditer le challenge" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditChallengePage({ params }: Props): Promise<React.ReactElement> {
  await requireAdminPage();
  const { id } = await params;

  const [challenge, allChallenges] = await Promise.all([
    prisma.challenge.findUnique({
      where: { id },
      select: {
        id: true,
        refCode: true,
        slug: true,
        title: true,
        description: true,
        instructions: true,
        category: true,
        difficulty: true,
        type: true,
        xpReward: true,
        timeLimitMin: true,
        maxAttempts: true,
        flag: true,
        machine: true,
        isActive: true,
        orderIndex: true,
        prerequisiteId: true,
        attachmentUrl: true,
        resourceUrl: true,
        starterCode: true,
        hints: {
          orderBy: { orderIndex: "asc" },
          select: { id: true, orderIndex: true, content: true, xpCost: true },
        },
        _count: { select: { progress: { where: { status: "COMPLETED" } } } },
      },
    }),
    prisma.challenge.findMany({
      where: { isActive: true },
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      select: { id: true, refCode: true, title: true },
    }),
  ]);

  if (!challenge) notFound();

  const prerequisites: ChallengeOption[] = allChallenges.map((c) => ({
    id: c.id,
    refCode: c.refCode,
    title: c.title,
  }));

  return (
    <main className="a-page">
      <PageHeader
        crumbs={[{ label: "Gamification" }, { label: "Challenges", href: "/challenges" }]}
        title={challenge.title}
        description={<span className="a-mono">{challenge.refCode}</span>}
      />
      <div className="a-stack">
        <Card pad>
          <EditChallengeForm
            challenge={{
              id: challenge.id,
              refCode: challenge.refCode,
              slug: challenge.slug,
              title: challenge.title,
              description: challenge.description,
              instructions: challenge.instructions,
              category: challenge.category,
              difficulty: challenge.difficulty,
              type: challenge.type,
              xpReward: challenge.xpReward,
              timeLimitMin: challenge.timeLimitMin,
              maxAttempts: challenge.maxAttempts,
              flag: challenge.flag,
              machine: challenge.machine === null ? "" : JSON.stringify(challenge.machine, null, 2),
              starterCode: challenge.starterCode,
              isActive: challenge.isActive,
              orderIndex: challenge.orderIndex,
              prerequisiteId: challenge.prerequisiteId,
              attachmentUrl: challenge.attachmentUrl,
              resourceUrl: challenge.resourceUrl,
              solveCount: challenge._count.progress,
            }}
            prerequisites={prerequisites}
          />
        </Card>
        <Card pad>
          <HintsManager challengeId={challenge.id} hints={challenge.hints} />
        </Card>
      </div>
    </main>
  );
}
