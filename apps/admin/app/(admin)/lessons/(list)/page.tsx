import React from "react";
import type { Metadata } from "next";
import { lessonRepository, quizReportRepository } from "@cyberlearn/db";
import { GhostLink, PageHeader, PrimaryLink } from "../../_components/admin-ui";
import { ArchiveFirstCatalogueButton } from "../../_components/archive-first-catalogue-button";
import { LESSON_COLUMNS, LESSONS_HEADER, lessonFacets } from "../_components/lesson-columns";
import { lessonGridRows } from "../_components/lesson-rows";
import { LessonsGrid } from "../_components/lessons-grid";
import type { RawParams } from "@/lib/grid-params";
import {
  lessonListSearch,
  lessonQueryOf,
  LESSONS_PAGE_SIZE,
  parseLessonListParams,
} from "@/lib/list-params";
import { firstCatalogueCounts } from "@/lib/services/first-catalogue.service";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Leçons" };

/**
 * The working list of lessons, drafts and published ones, a page of 50 at a
 * time under the filters of the URL (?q=&category=&difficulty=&status=&origin=
 * &sort=&page=). The dashboard's content meters open it already filtered.
 */
export default async function AdminLessonsPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}): Promise<React.ReactElement> {
  await requireAdminPage();
  const params = parseLessonListParams(await searchParams, "active");
  const [slice, counts, openReports, first] = await Promise.all([
    lessonRepository.listForConsole(lessonQueryOf(params, "active")),
    lessonRepository.countByStatus(),
    quizReportRepository.countOpen(),
    firstCatalogueCounts(),
  ]);

  return (
    <main className="a-page">
      <PageHeader
        crumbs={LESSONS_HEADER.crumbs}
        title={`${LESSONS_HEADER.title} (${String(counts.PUBLISHED + counts.DRAFT)})`}
        description={`${String(counts.PUBLISHED)} publiée${counts.PUBLISHED !== 1 ? "s" : ""} · ${String(counts.DRAFT)} brouillon${counts.DRAFT !== 1 ? "s" : ""}. Les leçons archivées sont rangées à part.`}
        actions={
          <>
            <ArchiveFirstCatalogueButton paths={first.paths} lessons={first.lessons} />
            <GhostLink href="/lessons/archives">Archives ({String(counts.ARCHIVED)})</GhostLink>
            <GhostLink href="/lessons/sync">Synchroniser avec le dépôt</GhostLink>
            <GhostLink href="/lessons/reports">
              Questions signalées{openReports > 0 ? ` (${String(openReports)})` : ""}
            </GhostLink>
            <GhostLink href="/lessons/import">Importer MDX</GhostLink>
            <PrimaryLink href="/lessons/new">Nouvelle leçon</PrimaryLink>
          </>
        }
      />

      <LessonsGrid
        folder="active"
        columns={LESSON_COLUMNS}
        rows={lessonGridRows(slice.rows)}
        server={{
          path: "/lessons",
          params: lessonListSearch({ ...params, page: slice.page }),
          total: slice.total,
          page: slice.page,
          pageSize: LESSONS_PAGE_SIZE,
          sort: params.sort,
        }}
        facets={lessonFacets("active", params)}
      />
    </main>
  );
}
