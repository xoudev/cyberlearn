import React from "react";
import type { Metadata } from "next";
import { lessonRepository, pathRepository } from "@cyberlearn/db";
import { PageHeader, Tag } from "../../_components/admin-ui";
import { CONTENT_STATUS } from "../../_components/content-status";
import { NEW_PATH_HEADER } from "../_components/path-columns";
import { NewPathClient } from "./_components/NewPathClient";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Nouveau parcours" };

export const dynamic = "force-dynamic";

export default async function NewPathPage(): Promise<React.ReactElement> {
  await requireAdminPage();
  const [lessons, paths] = await Promise.all([
    // Drafts included: a path is staged before either is published.
    lessonRepository.findStageableForPath(),
    pathRepository.findAllRefCodes(),
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
        crumbs={NEW_PATH_HEADER.crumbs}
        title={NEW_PATH_HEADER.title}
        description={<Tag tone={CONTENT_STATUS.DRAFT.tone}>Brouillon · non publié</Tag>}
      />
      <NewPathClient availableLessons={lessons} nextRefCode={nextRefCode} />
    </main>
  );
}
