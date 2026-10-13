import React from "react";
import { PageHeader } from "../../_components/admin-ui";
import { Bar, DataGridSkeleton, KpiGridSkeleton } from "../../_components/data-grid-skeleton";
import { PENDING_COLUMNS, USER_KPI_LABELS, USERS_HEADER } from "../_components/columns";
import { UsersTabs } from "../_components/users-head";

/** The pending sign-ups while Supabase Auth is read, laid out as the page renders them. */
export default function PendingSignUpsLoading(): React.ReactElement {
  return (
    <main className="a-page">
      <PageHeader
        crumbs={USERS_HEADER.crumbs}
        title={USERS_HEADER.title}
        description={USERS_HEADER.description}
      />
      <KpiGridSkeleton labels={USER_KPI_LABELS} />
      <UsersTabs current="pending" />
      <p className="a-sub a-tab-note" aria-hidden="true">
        <Bar width={620} height={13} />
      </p>
      <DataGridSkeleton columns={PENDING_COLUMNS} rows={6} />
    </main>
  );
}
