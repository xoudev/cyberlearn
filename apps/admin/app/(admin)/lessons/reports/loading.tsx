import React from "react";
import { PageHeader } from "../../_components/admin-ui";
import { ActionsSkeleton } from "../../_components/data-grid-skeleton";
import { LineSkeleton, ReportCardsSkeleton } from "../../_components/page-skeletons";
import { REPORTS_HEADER } from "../_components/lesson-headers";

/** The reported questions while they load: one card per question, most reported first. */
export default function QuizReportsLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={REPORTS_HEADER.crumbs}
        title={REPORTS_HEADER.title}
        description={<LineSkeleton width={520} />}
        actions={<ActionsSkeleton widths={[190]} />}
      />
      <ReportCardsSkeleton cards={3} />
    </main>
  );
}
