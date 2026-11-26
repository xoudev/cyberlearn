import React from "react";
import { PageHeader } from "../../../_components/admin-ui";
import { DataGridSkeleton, KpiGridSkeleton } from "../../../_components/data-grid-skeleton";
import {
  LESSON_CRUMBS,
  LESSON_PROGRESS_COLUMNS,
  LESSON_PROGRESS_HEADER,
  LESSON_PROGRESS_KPI_LABELS,
} from "../../_components/lesson-headers";

/**
 * A lesson's progress while it loads: the trail without the lesson's title,
 * which comes with the figures, the four figures, then the quizzes.
 */
export default function LessonProgressLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={LESSON_CRUMBS}
        title={LESSON_PROGRESS_HEADER.title}
        description={LESSON_PROGRESS_HEADER.description}
      />
      <KpiGridSkeleton labels={LESSON_PROGRESS_KPI_LABELS} />
      <DataGridSkeleton columns={LESSON_PROGRESS_COLUMNS} rows={6} />
    </main>
  );
}
