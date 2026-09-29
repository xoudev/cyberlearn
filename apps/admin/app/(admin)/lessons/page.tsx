import React from "react";
import type { Metadata } from "next";
import { quizReportRepository } from "@cyberlearn/db";
import { GhostLink, PageHeader, PrimaryLink } from "../_components/admin-ui";
import { ArchiveFirstCatalogueButton } from "../_components/archive-first-catalogue-button";
import { LessonsTable } from "./_components/lessons-table";
import { firstCatalogueCounts } from "@/lib/services/first-catalogue.service";
import { listLessons } from "@/lib/services/lesson-list.service";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Leçons" };

export default async function AdminLessonsPage(): Promise<React.ReactElement> {
  await requireAdminPage();
  const [{ rows, counts }, openReports, first] = await Promise.all([
    listLessons("active"),
    quizReportRepository.countOpen(),
    firstCatalogueCounts(),
  ]);

  return (
    <main className="admin-page-content">
      <PageHeader
        eyebrow="Contenu"
        title={`Leçons (${String(rows.length)})`}
        description={`${String(counts.published)} publiée${counts.published !== 1 ? "s" : ""} · ${String(counts.draft)} brouillon${counts.draft !== 1 ? "s" : ""}. Les leçons archivées sont rangées à part.`}
        actions={
          <>
            <ArchiveFirstCatalogueButton paths={first.paths} lessons={first.lessons} />
            <GhostLink href="/lessons/archives">Archives ({String(counts.archived)})</GhostLink>
            <GhostLink href="/lessons/sync">Synchroniser avec le dépôt</GhostLink>
            <GhostLink href="/lessons/reports">
              Questions signalées{openReports > 0 ? ` (${String(openReports)})` : ""}
            </GhostLink>
            <GhostLink href="/lessons/import">Importer MDX</GhostLink>
            <PrimaryLink href="/lessons/new">Nouvelle leçon</PrimaryLink>
          </>
        }
      />

      <LessonsTable lessons={rows} folder="active" />
    </main>
  );
}
