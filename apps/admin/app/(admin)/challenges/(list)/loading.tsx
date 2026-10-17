import React from "react";
import { PageHeader } from "../../_components/admin-ui";
import { ActionsSkeleton, DataGridSkeleton } from "../../_components/data-grid-skeleton";
import { LineSkeleton } from "../../_components/page-skeletons";
import { CHALLENGE_COLUMNS, CHALLENGES_HEADER } from "../_components/challenge-columns";

/** The challenges while they load: the grid of the list's own columns, with its three filters. */
export default function AdminChallengesLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={CHALLENGES_HEADER.crumbs}
        title={CHALLENGES_HEADER.title}
        description={<LineSkeleton width={480} />}
        actions={<ActionsSkeleton widths={[190]} />}
      />
      <DataGridSkeleton columns={CHALLENGE_COLUMNS} facets={3} rows={10} />
    </main>
  );
}
