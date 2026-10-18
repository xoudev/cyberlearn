import React from "react";
import { PageHeader } from "../../_components/admin-ui";
import { ActionsSkeleton } from "../../_components/data-grid-skeleton";
import { LineSkeleton, ReportCardsSkeleton } from "../../_components/page-skeletons";
import { REPORTS_HEADER } from "../_components/moderation-head";

/** The reports while they load: one card per reported content, most reported first. */
export default function ContentReportsLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={REPORTS_HEADER.crumbs}
        title={REPORTS_HEADER.title}
        description={<LineSkeleton width={520} />}
        actions={<ActionsSkeleton widths={[160]} />}
      />
      <ReportCardsSkeleton cards={3} />
    </main>
  );
}
