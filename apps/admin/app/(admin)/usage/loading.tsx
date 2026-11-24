import React from "react";
import { Card, PageHeader } from "../_components/admin-ui";
import { KpiGridSkeleton } from "../_components/data-grid-skeleton";
import { TableSkeleton } from "../_components/page-skeletons";
import {
  COHORT_COLUMNS,
  STALLED_COLUMNS,
  USAGE_CARDS,
  USAGE_HEADER,
  USAGE_KPI_LABELS,
} from "./_components/usage-head";

/** The usage page while its figures are counted: the four figures, then its two tables. */
export default function UsageLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={USAGE_HEADER.crumbs}
        title={USAGE_HEADER.title}
        description={USAGE_HEADER.description}
      />
      <KpiGridSkeleton labels={USAGE_KPI_LABELS} />
      <Card title={USAGE_CARDS.cohorts}>
        <TableSkeleton columns={COHORT_COLUMNS} rows={8} />
      </Card>
      <Card title={USAGE_CARDS.lessons}>
        <TableSkeleton columns={STALLED_COLUMNS} rows={6} />
      </Card>
    </main>
  );
}
