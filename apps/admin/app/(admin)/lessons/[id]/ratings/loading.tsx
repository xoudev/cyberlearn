import React from "react";
import { PageHeader } from "../../../_components/admin-ui";
import { DataGridSkeleton, KpiGridSkeleton } from "../../../_components/data-grid-skeleton";
import {
  LESSON_CRUMBS,
  LESSON_RATING_COLUMNS,
  LESSON_RATING_KPI_LABELS,
  LESSON_RATINGS_HEADER,
} from "../../_components/lesson-headers";

/**
 * A lesson's ratings while they load: the trail without the lesson's title,
 * which comes with the rows, the two figures, then the grid.
 */
export default function LessonRatingsLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={LESSON_CRUMBS}
        title={LESSON_RATINGS_HEADER.title}
        description={LESSON_RATINGS_HEADER.description}
      />
      <KpiGridSkeleton labels={LESSON_RATING_KPI_LABELS} />
      <DataGridSkeleton columns={LESSON_RATING_COLUMNS} facets={1} rows={10} />
    </main>
  );
}
