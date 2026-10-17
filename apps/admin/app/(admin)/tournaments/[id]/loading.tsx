import React from "react";
import { PageHeader } from "../../_components/admin-ui";
import { ActionsSkeleton } from "../../_components/data-grid-skeleton";
import { LineSkeleton, TitleSkeleton } from "../../_components/page-skeletons";
import { TournamentFormSkeleton } from "../_components/tournament-form-skeleton";
import { TOURNAMENT_CRUMBS } from "../_components/tournament-head";

/**
 * A tournament while it loads: its name, phase and controls wait, then its
 * form. The standings appear with the page, once the phase says there are any.
 */
export default function TournamentLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={TOURNAMENT_CRUMBS}
        title={<TitleSkeleton width={320} />}
        description={<LineSkeleton width={140} />}
        actions={<ActionsSkeleton widths={[80, 160, 150]} />}
      />
      <TournamentFormSkeleton />
    </main>
  );
}
