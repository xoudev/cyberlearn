import React from "react";
import { Skeleton } from "@cyberlearn/ui";
import { Card, PageHeader } from "../../_components/admin-ui";
import { ActionsSkeleton, KpiGridSkeleton } from "../../_components/data-grid-skeleton";
import { LineSkeleton } from "../../_components/page-skeletons";
import { STRUCTURE_HEADER, STRUCTURE_KPI_LABELS } from "../_components/class-columns";

/** The schools and their years while they load: the figures, then a card per school. */
export default function StructureLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={STRUCTURE_HEADER.crumbs}
        title={STRUCTURE_HEADER.title}
        description={STRUCTURE_HEADER.description}
        actions={<ActionsSkeleton widths={[170, 100]} />}
      />
      <KpiGridSkeleton labels={STRUCTURE_KPI_LABELS} />
      <div className="a-stack">
        {Array.from({ length: 2 }, (_, index) => (
          <Card key={index} title={<LineSkeleton width={200} height={10} />} pad>
            <div className="a-stack-tight" aria-hidden="true">
              {Array.from({ length: 3 }, (_, row) => (
                <Skeleton key={row} h={44} />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
