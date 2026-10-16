import React from "react";
import type { Metadata } from "next";
import { prisma } from "@cyberlearn/db";
import { PageHeader, Tag } from "../../_components/admin-ui";
import { CONTENT_STATUS } from "../../_components/content-status";
import { NewPathClient } from "./_components/NewPathClient";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Nouveau parcours" };

export const dynamic = "force-dynamic";

export default async function NewPathPage(): Promise<React.ReactElement> {
  await requireAdminPage();
  const [lessons, paths] = await Promise.all([
    prisma.lesson.findMany({
      // Drafts are offered on purpose here - a path is staged before either is
      // published - but a class's own lesson never belongs in one.
      where: { audience: "CATALOGUE" },
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
    prisma.path.findMany({ select: { refCode: true } }),
  ]);

  // Pre-fill the ref code with the next sequence number (CL-PATH-{NNN}-V01).
  let maxNum = 0;
  for (const p of paths) {
    const match = /^CL-PATH-(\d{3})-V\d{2}$/.exec(p.refCode);
    if (match?.[1]) maxNum = Math.max(maxNum, Number.parseInt(match[1], 10));
  }
  const nextRefCode = `CL-PATH-${String(maxNum + 1).padStart(3, "0")}-V01`;

  return (
    <main className="a-page">
      <PageHeader
        crumbs={[{ label: "Contenu" }, { label: "Parcours", href: "/paths" }]}
        title="Créer un parcours"
        description={<Tag tone={CONTENT_STATUS.DRAFT.tone}>Brouillon · non publié</Tag>}
      />
      <NewPathClient availableLessons={lessons} nextRefCode={nextRefCode} />
    </main>
  );
}
