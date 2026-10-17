import React from "react";
import { Skeleton } from "@cyberlearn/ui";
import { Card, PageHeader } from "../../_components/admin-ui";
import { ActionsSkeleton, KpiGridSkeleton } from "../../_components/data-grid-skeleton";
import { LineSkeleton } from "../../_components/page-skeletons";
import { MODERATION_HEADER, MODERATION_KPI_LABELS } from "../_components/moderation-head";

/**
 * The moderation queue while it loads: the figures, then the refusals to
 * review, each with its excerpt, its findings and its buttons.
 */
export default function ModerationLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={MODERATION_HEADER.crumbs}
        title={MODERATION_HEADER.title}
        description={MODERATION_HEADER.description}
        actions={<ActionsSkeleton widths={[220]} />}
      />
      <KpiGridSkeleton labels={MODERATION_KPI_LABELS} />
      <Card title={<LineSkeleton width={100} height={10} />} pad>
        <div className="a-mod-queue" aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="a-mod-row">
              <div className="a-mod-head">
                <Skeleton as="span" w={64} h={18} />
                <Skeleton as="span" w={150} h={11} />
                <Skeleton as="span" w={240} h={11} />
              </div>
              <Skeleton h={64} />
              <div className="a-mod-findings">
                <Skeleton as="span" w={140} h={18} />
                <Skeleton as="span" w={110} h={18} />
              </div>
              <div className="a-row-actions">
                <Skeleton as="span" w={120} h={32} />
                <Skeleton as="span" w={120} h={32} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}
