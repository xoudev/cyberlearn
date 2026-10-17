import React from "react";
import { PageHeader } from "../_components/admin-ui";
import {
  ActionsSkeleton,
  DataGridSkeleton,
  FiltersSkeleton,
} from "../_components/data-grid-skeleton";
import { LineSkeleton } from "../_components/page-skeletons";
import { AUDIT_COLUMNS, AUDIT_FILTER_LABELS, AUDIT_HEADER } from "./_components/columns";

/** The audit log while it loads: its filters over the grid of its own columns. */
export default function AuditLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={AUDIT_HEADER.crumbs}
        title={AUDIT_HEADER.title}
        description={<LineSkeleton width={520} />}
        actions={<ActionsSkeleton widths={[170]} />}
      />
      <DataGridSkeleton
        columns={AUDIT_COLUMNS}
        toolbar={<FiltersSkeleton labels={Object.values(AUDIT_FILTER_LABELS)} />}
        rows={12}
      />
    </main>
  );
}
