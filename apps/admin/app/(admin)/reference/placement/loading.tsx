import React from "react";
import { PageHeader } from "../../_components/admin-ui";
import { DataGridSkeleton } from "../../_components/data-grid-skeleton";
import { ReferenceChrome } from "../_components/reference-chrome";
import { PLACEMENT_COLUMNS, PLACEMENT_HEADER } from "../_components/reference-head";

/** The placement questions while they load: the domain and level filters, the rows waiting. */
export default function ReferencePlacementLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={PLACEMENT_HEADER.crumbs}
        title={PLACEMENT_HEADER.title}
        description={PLACEMENT_HEADER.description}
      />
      <ReferenceChrome current="placement" source={PLACEMENT_HEADER.source} />
      <DataGridSkeleton columns={PLACEMENT_COLUMNS} facets={2} rows={8} leadLines={2} />
    </main>
  );
}
