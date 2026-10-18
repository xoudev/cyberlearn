import React from "react";
import { PageHeader } from "../../_components/admin-ui";
import { DataGridSkeleton } from "../../_components/data-grid-skeleton";
import { ReferenceChrome } from "../_components/reference-chrome";
import { SEASON_COLUMNS, SEASONS_HEADER } from "../_components/reference-head";

/** The seasons while they load: no search box, a status filter, the rows waiting. */
export default function ReferenceSeasonsLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={SEASONS_HEADER.crumbs}
        title={SEASONS_HEADER.title}
        description={SEASONS_HEADER.description}
      />
      <ReferenceChrome current="seasons" source={SEASONS_HEADER.source} />
      <DataGridSkeleton columns={SEASON_COLUMNS} search={false} facets={1} rows={8} />
    </main>
  );
}
