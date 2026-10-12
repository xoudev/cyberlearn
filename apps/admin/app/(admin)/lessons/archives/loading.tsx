import React from "react";
import { GhostLink, PageHeader } from "../../_components/admin-ui";
import { DataGridSkeleton } from "../../_components/data-grid-skeleton";
import { ARCHIVES_HEADER, LESSON_COLUMNS, lessonFacetCount } from "../_components/lesson-columns";

/** The archived lessons while they load: the same grid as the working list, without its status filter. */
export default function ArchivedLessonsLoading(): React.ReactElement {
  return (
    <main className="a-page">
      <PageHeader
        crumbs={ARCHIVES_HEADER.crumbs}
        title={ARCHIVES_HEADER.title}
        description={ARCHIVES_HEADER.description}
        actions={<GhostLink href="/lessons">Retour aux leçons</GhostLink>}
      />
      <DataGridSkeleton
        columns={LESSON_COLUMNS}
        facets={lessonFacetCount("archives")}
        rows={6}
        selectable
        leadLines={2}
      />
    </main>
  );
}
