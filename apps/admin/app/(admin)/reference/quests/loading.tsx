import React from "react";
import { PageHeader } from "../../_components/admin-ui";
import { DataGridSkeleton } from "../../_components/data-grid-skeleton";
import { ReferenceChrome } from "../_components/reference-chrome";
import { QUEST_COLUMNS, QUESTS_HEADER } from "../_components/reference-head";

/** The quests while they load: the header, the tabs and the notice as they are, the rows waiting. */
export default function ReferenceQuestsLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={QUESTS_HEADER.crumbs}
        title={QUESTS_HEADER.title}
        description={QUESTS_HEADER.description}
      />
      <ReferenceChrome current="quests" source={QUESTS_HEADER.source} />
      <DataGridSkeleton columns={QUEST_COLUMNS} facets={1} rows={6} leadLines={3} />
    </main>
  );
}
