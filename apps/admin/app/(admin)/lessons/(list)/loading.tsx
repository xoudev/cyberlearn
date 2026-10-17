import React from "react";
import { PageHeader } from "../../_components/admin-ui";
import { ActionsSkeleton, DataGridSkeleton } from "../../_components/data-grid-skeleton";
import { LineSkeleton } from "../../_components/page-skeletons";
import { LESSON_COLUMNS, LESSONS_HEADER, lessonFacetCount } from "../_components/lesson-columns";

/**
 * The lessons list while it loads: the header with its six actions, and the
 * grid with its boxes and four filters, from the page's own columns.
 */
export default function AdminLessonsLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={LESSONS_HEADER.crumbs}
        title={LESSONS_HEADER.title}
        description={<LineSkeleton width={320} />}
        actions={<ActionsSkeleton widths={[210, 130, 220, 190, 140, 150]} />}
      />
      <DataGridSkeleton
        columns={LESSON_COLUMNS}
        facets={lessonFacetCount("active")}
        rows={8}
        selectable
        leadLines={2}
      />
    </main>
  );
}
