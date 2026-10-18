import React from "react";
import { PageHeader } from "../../_components/admin-ui";
import { DataGridSkeleton } from "../../_components/data-grid-skeleton";
import { ReferenceChrome } from "../_components/reference-chrome";
import { COSMETIC_COLUMNS, COSMETICS_HEADER } from "../_components/reference-head";

/** The cosmetics while they load: the header, the tabs and the notice as they are, the rows waiting. */
export default function ReferenceCosmeticsLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={COSMETICS_HEADER.crumbs}
        title={COSMETICS_HEADER.title}
        description={COSMETICS_HEADER.description}
      />
      <ReferenceChrome current="cosmetics" source={COSMETICS_HEADER.source} />
      <DataGridSkeleton columns={COSMETIC_COLUMNS} facets={1} rows={10} leadLines={3} />
    </main>
  );
}
