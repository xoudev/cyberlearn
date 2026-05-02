import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@cyberlearn/db";
import { EditChallengeForm } from "./_components/edit-challenge-form";
import { HintsManager } from "./_components/hints-manager";
import type { ChallengeOption } from "../../new/_components/new-challenge-form";

export const metadata: Metadata = { title: "Éditer le challenge" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditChallengePage({ params }: Props): Promise<React.ReactElement> {
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
    <div style={{ padding: "32px 40px", maxWidth: 900 }}>
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "#FF4D6D",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          {"// ADMIN › CHALLENGES › ÉDITER"}
        </div>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 24,
            fontWeight: 700,
            color: "#F5F5FA",
            margin: "0 0 4px",
          }}
        >
          {challenge.title}
        </h1>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#6B6890",
            margin: 0,
          }}
        >
          {challenge.refCode}
        </p>
      </div>

      <div
        style={{
          background: "#0A0826",
          border: "1px solid #1F1B47",
          padding: 32,
          marginBottom: 24,
        }}
      >
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
      </div>

      <div
        style={{
          background: "#0A0826",
          border: "1px solid #1F1B47",
          padding: 32,
        }}
      >
        <HintsManager challengeId={challenge.id} hints={challenge.hints} />
      </div>
    </div>
  );
}
