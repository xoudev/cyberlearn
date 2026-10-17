import React from "react";
import { PageHeader } from "../../_components/admin-ui";
import { ActionsSkeleton } from "../../_components/data-grid-skeleton";
import { LineSkeleton, ReportCardsSkeleton } from "../../_components/page-skeletons";
import { NOTES_HEADER } from "../_components/moderation-head";

/** The reported notes while they load: one card per note, most reported first. */
export default function ReportedNotesLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={NOTES_HEADER.crumbs}
        title={NOTES_HEADER.title}
        description={<LineSkeleton width={520} />}
        actions={<ActionsSkeleton widths={[220]} />}
      />
      <ReportCardsSkeleton cards={3} />
    </main>
  );
}
