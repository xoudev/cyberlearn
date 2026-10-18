import React from "react";
import { PageHeader } from "../../../_components/admin-ui";
import { DataGridSkeleton, KpiGridSkeleton } from "../../../_components/data-grid-skeleton";
import {
  SOLVE_COLUMNS,
  SOLVE_KPI_LABELS,
  TOURNAMENT_CRUMBS,
  TOURNAMENT_SOLVES_HEADER,
} from "../../_components/tournament-head";

/**
 * A tournament's flags while they load: the trail without the tournament's
 * name, which comes with the rows, the two figures, then the grid.
 */
export default function TournamentFlagsLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={TOURNAMENT_CRUMBS}
        title={TOURNAMENT_SOLVES_HEADER.title}
        description={TOURNAMENT_SOLVES_HEADER.description}
      />
      <KpiGridSkeleton labels={SOLVE_KPI_LABELS} />
      <DataGridSkeleton columns={SOLVE_COLUMNS} facets={1} rows={10} />
    </main>
  );
}
