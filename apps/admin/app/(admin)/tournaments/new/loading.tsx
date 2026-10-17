import React from "react";
import { PageHeader } from "../../_components/admin-ui";
import { TournamentFormSkeleton } from "../_components/tournament-form-skeleton";
import { NEW_TOURNAMENT_HEADER } from "../_components/tournament-head";

/** The tournament form while the classes and challenges it offers are read. */
export default function NewTournamentLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={NEW_TOURNAMENT_HEADER.crumbs}
        title={NEW_TOURNAMENT_HEADER.title}
        description={NEW_TOURNAMENT_HEADER.description}
      />
      <TournamentFormSkeleton />
    </main>
  );
}
