import React from "react";
import { PageHeader } from "../../_components/admin-ui";
import { DataGridSkeleton, KpiGridSkeleton } from "../../_components/data-grid-skeleton";
import { USER_COLUMNS, USER_KPI_LABELS, USERS_HEADER } from "../_components/columns";
import { UsersTabs } from "../_components/users-head";

/** The account list while it loads: its header, figures, tabs and grid, from the page's own constants. */
export default function AdminUsersLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={USERS_HEADER.crumbs}
        title={USERS_HEADER.title}
        description={USERS_HEADER.description}
      />
      <KpiGridSkeleton labels={USER_KPI_LABELS} />
      <UsersTabs current="accounts" />
      <DataGridSkeleton columns={USER_COLUMNS} facets={1} rows={10} />
    </main>
  );
}
