import React from "react";
import type { Metadata } from "next";
import { lessonRepository } from "@cyberlearn/db";
import { GhostLink, PageHeader } from "../../_components/admin-ui";
import { ARCHIVES_HEADER, LESSON_COLUMNS, lessonFacets } from "../_components/lesson-columns";
import { lessonGridRows } from "../_components/lesson-rows";
import { LessonsGrid } from "../_components/lessons-grid";
import type { RawParams } from "@/lib/grid-params";
import {
  lessonListSearch,
  lessonQueryOf,
  LESSONS_PAGE_SIZE,
  parseLessonListParams,
} from "@/lib/list-params";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Leçons archivées" };

export default async function ArchivedLessonsPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}): Promise<React.ReactElement> {
  await requireAdminPage();
  const params = parseLessonListParams(await searchParams, "archives");
  const [slice, counts] = await Promise.all([
    lessonRepository.listForConsole(lessonQueryOf(params, "archives")),
    lessonRepository.countByStatus(),
  ]);

  return (
    <main className="a-page">
      <PageHeader
        crumbs={ARCHIVES_HEADER.crumbs}
        title={`${ARCHIVES_HEADER.title} (${String(counts.ARCHIVED)})`}
        description={ARCHIVES_HEADER.description}
        actions={<GhostLink href="/lessons">Retour aux leçons</GhostLink>}
      />

      <LessonsGrid
        folder="archives"
        columns={LESSON_COLUMNS}
        rows={lessonGridRows(slice.rows)}
        server={{
          path: "/lessons/archives",
          params: lessonListSearch({ ...params, page: slice.page }),
          total: slice.total,
          page: slice.page,
          pageSize: LESSONS_PAGE_SIZE,
          sort: params.sort,
        }}
        facets={lessonFacets("archives", params)}
      />
    </main>
  );
}
