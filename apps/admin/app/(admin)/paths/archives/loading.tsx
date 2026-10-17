import React from "react";
import { PageHeader } from "../../_components/admin-ui";
import { ActionsSkeleton, DataGridSkeleton } from "../../_components/data-grid-skeleton";
import { PATH_ARCHIVES_HEADER, PATH_COLUMNS, pathFacetCount } from "../_components/path-columns";

/** The archived paths while they load: the same grid as the working list, without its status filter. */
export default function ArchivedPathsLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={PATH_ARCHIVES_HEADER.crumbs}
        title={PATH_ARCHIVES_HEADER.title}
        description={PATH_ARCHIVES_HEADER.description}
        actions={<ActionsSkeleton widths={[200]} />}
      />
      <DataGridSkeleton
        columns={PATH_COLUMNS}
        facets={pathFacetCount("archives")}
        rows={6}
        leadLines={2}
      />
    </main>
  );
}
