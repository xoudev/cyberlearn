import React from "react";
import { PageHeader } from "../../_components/admin-ui";
import {
  ActionsSkeleton,
  DataGridSkeleton,
  KpiGridSkeleton,
} from "../../_components/data-grid-skeleton";
import { CLASS_COLUMNS, CLASS_KPI_LABELS, CLASSES_HEADER } from "../_components/class-columns";

/** The classes while they load: their figures, then the grid of the list's own columns. */
export default function AdminClassesLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={CLASSES_HEADER.crumbs}
        title={CLASSES_HEADER.title}
        description={CLASSES_HEADER.description}
        actions={<ActionsSkeleton widths={[130, 100]} />}
      />
      <KpiGridSkeleton labels={CLASS_KPI_LABELS} />
      <DataGridSkeleton columns={CLASS_COLUMNS} facets={3} rows={10} />
    </main>
  );
}
