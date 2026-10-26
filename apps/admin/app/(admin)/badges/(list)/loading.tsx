import React from "react";
import { PageHeader } from "../../_components/admin-ui";
import { ActionsSkeleton, DataGridSkeleton } from "../../_components/data-grid-skeleton";
import { LineSkeleton } from "../../_components/page-skeletons";
import { BADGE_COLUMNS, BADGES_HEADER } from "../_components/badge-columns";

/** The badges while they load: the grid of the list's own columns, with its two filters. */
export default function AdminBadgesLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={BADGES_HEADER.crumbs}
        title={BADGES_HEADER.title}
        description={<LineSkeleton width={460} />}
        actions={<ActionsSkeleton widths={[160]} />}
      />
      <DataGridSkeleton columns={BADGE_COLUMNS} facets={2} rows={10} />
    </main>
  );
}
