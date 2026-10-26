import React from "react";
import { PageHeader } from "../../_components/admin-ui";
import { DataGridSkeleton, KpiGridSkeleton } from "../../_components/data-grid-skeleton";
import { TICKET_COLUMNS, TICKET_KPI_LABELS, TICKETS_HEADER } from "../_components/ticket-columns";

/** The ticket queue while it loads: its figures, then the grid of its own columns. */
export default function AdminTicketsLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={TICKETS_HEADER.crumbs}
        title={TICKETS_HEADER.title}
        description={TICKETS_HEADER.description}
      />
      <KpiGridSkeleton labels={TICKET_KPI_LABELS} />
      <DataGridSkeleton columns={TICKET_COLUMNS} facets={4} rows={10} leadLines={2} />
    </main>
  );
}
