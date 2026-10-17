import React from "react";
import { Skeleton } from "@cyberlearn/ui";
import { Card, PageHeader } from "../../_components/admin-ui";
import { ActionsSkeleton } from "../../_components/data-grid-skeleton";
import { LineSkeleton, TableSkeleton, TitleSkeleton } from "../../_components/page-skeletons";
import { CLASS_CRUMBS } from "../_components/class-columns";

/**
 * A class while it loads: its details folded in their card, then the
 * teachers beside the students. The school and the year join the trail once
 * the class is read.
 */
export default function ClassLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={CLASS_CRUMBS}
        title={<TitleSkeleton width={200} />}
        description={<LineSkeleton width={260} />}
        actions={<ActionsSkeleton widths={[190]} />}
      />
      <Card title={<LineSkeleton width={110} height={10} />} pad>
        <Skeleton h={44} aria-hidden="true" />
      </Card>
      <div className="admin-roster-grid">
        <Card title={<LineSkeleton width={130} height={10} />} pad>
          <TableSkeleton columns={2} rows={2} />
        </Card>
        <Card title={<LineSkeleton width={110} height={10} />} pad>
          <TableSkeleton columns={3} rows={6} />
        </Card>
      </div>
    </main>
  );
}
