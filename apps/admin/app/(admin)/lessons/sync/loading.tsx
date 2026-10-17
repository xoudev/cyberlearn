import React from "react";
import { Skeleton } from "@cyberlearn/ui";
import { PageHeader } from "../../_components/admin-ui";
import { ActionsSkeleton, KpiGridSkeleton } from "../../_components/data-grid-skeleton";
import { SYNC_HEADER, SYNC_KPI_LABELS } from "../_components/lesson-headers";

/**
 * The sync while the repository is compared with the database: its five
 * figures, then a card per lesson to bring up to date.
 */
export default function LessonSyncLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={SYNC_HEADER.crumbs}
        title={SYNC_HEADER.title}
        description={SYNC_HEADER.description}
        actions={<ActionsSkeleton widths={[190]} />}
      />
      <KpiGridSkeleton labels={SYNC_KPI_LABELS} className="a-sync-kpis" />
      <div className="a-sync-list" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <section key={index} className="a-card">
            <div className="a-card-head">
              <div className="a-stack-tight">
                <Skeleton as="span" w={160} h={10} />
                <Skeleton as="span" w={280} h={15} />
              </div>
              <Skeleton as="span" w={130} h={32} />
            </div>
            <div className="a-card-pad">
              <div className="a-stack-tight">
                <Skeleton as="span" w="75%" h={12} />
                <Skeleton as="span" w="50%" h={12} />
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
