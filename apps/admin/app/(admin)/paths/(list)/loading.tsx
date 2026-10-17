import React from "react";
import { PageHeader } from "../../_components/admin-ui";
import { ActionsSkeleton, DataGridSkeleton } from "../../_components/data-grid-skeleton";
import { LineSkeleton } from "../../_components/page-skeletons";
import { PATH_COLUMNS, PATHS_HEADER, pathFacetCount } from "../_components/path-columns";

/**
 * The paths while they load: the header with its three actions, and the grid
 * with its filters, from the list's own columns.
 */
export default function AdminPathsLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={PATHS_HEADER.crumbs}
        title={PATHS_HEADER.title}
        description={<LineSkeleton width={480} />}
        actions={<ActionsSkeleton widths={[210, 130, 180]} />}
      />
      <DataGridSkeleton
        columns={PATH_COLUMNS}
        facets={pathFacetCount("active")}
        rows={8}
        leadLines={2}
      />
    </main>
  );
}
