import React from "react";
import { Skeleton } from "@cyberlearn/ui";
import { Card, PageHeader } from "../_components/admin-ui";
import { ActionsSkeleton, KpiGridSkeleton } from "../_components/data-grid-skeleton";
import { FeedSkeleton, LineSkeleton, TableSkeleton } from "../_components/page-skeletons";
import {
  DASHBOARD_CARDS,
  DASHBOARD_HEADER,
  DASHBOARD_KPI_LABELS,
  RECENT_USER_COLUMNS,
} from "./_components/dashboard-head";

/**
 * The overview while it loads, in the page's own order: the four figures, the
 * errors of the last day, then the activity beside the newest accounts and
 * the content meters.
 */
export default function AdminDashboardLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={DASHBOARD_HEADER.crumbs}
        title={DASHBOARD_HEADER.title}
        description={DASHBOARD_HEADER.description}
        actions={<ActionsSkeleton widths={[160, 170]} />}
      />

      <KpiGridSkeleton labels={DASHBOARD_KPI_LABELS} />

      <Card title={DASHBOARD_CARDS.errors}>
        <FeedSkeleton items={3} />
      </Card>

      <div className="a-split">
        <Card title={DASHBOARD_CARDS.activity} action={<LineSkeleton width={80} height={10} />}>
          <FeedSkeleton items={8} />
        </Card>

        <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <Card title={DASHBOARD_CARDS.newUsers} action={<LineSkeleton width={50} height={10} />}>
            <TableSkeleton columns={RECENT_USER_COLUMNS} rows={5} />
          </Card>

          <Card
            title={DASHBOARD_CARDS.content}
            action={<LineSkeleton width={60} height={10} />}
            pad
          >
            <div style={{ display: "grid", gap: 16 }} aria-hidden="true">
              {Array.from({ length: 3 }, (_, index) => (
                <span key={index} className="a-meter">
                  <span style={{ display: "flex", justifyContent: "space-between" }}>
                    <Skeleton as="span" w={80} h={10} />
                    <Skeleton as="span" w={24} h={10} />
                  </span>
                  <Skeleton as="span" w="100%" h={4} />
                </span>
              ))}
              <Skeleton as="span" w={140} h={10} />
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
