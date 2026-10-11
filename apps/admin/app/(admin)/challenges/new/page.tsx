import React from "react";
import type { Metadata } from "next";
import { prisma } from "@cyberlearn/db";
import { Card, PageHeader } from "../../_components/admin-ui";
import { NewChallengeForm } from "./_components/new-challenge-form";
import type { ChallengeOption } from "./_components/new-challenge-form";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Nouveau challenge" };

export default async function NewChallengePage(): Promise<React.ReactElement> {
  await requireAdminPage();
  const challenges = await prisma.challenge.findMany({
    where: { isActive: true },
    orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
    select: { id: true, refCode: true, title: true },
  });

  const prerequisites: ChallengeOption[] = challenges.map((c) => ({
    id: c.id,
    refCode: c.refCode,
    title: c.title,
  }));

  return (
    <main className="a-page">
      <PageHeader
        crumbs={[{ label: "Gamification" }, { label: "Challenges", href: "/challenges" }]}
        title="Nouveau challenge"
      />
      <Card pad>
        <NewChallengeForm prerequisites={prerequisites} />
      </Card>
    </main>
  );
}
