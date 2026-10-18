import React from "react";
import { Card, PageHeader } from "../../_components/admin-ui";
import { KpiGridSkeleton } from "../../_components/data-grid-skeleton";
import { TableSkeleton } from "../../_components/page-skeletons";
import { CRON_COLUMNS, CRON_KPI_LABELS, CRONS_HEADER } from "../_components/crons-head";

/** The scheduled jobs while their runs are read: the figures, then one row per job. */
export default function SystemCronsLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={CRONS_HEADER.crumbs}
        title={CRONS_HEADER.title}
        description={CRONS_HEADER.description}
      />
      <KpiGridSkeleton labels={CRON_KPI_LABELS} />
      <Card>
        <TableSkeleton columns={CRON_COLUMNS} rows={6} />
      </Card>
    </main>
  );
}
