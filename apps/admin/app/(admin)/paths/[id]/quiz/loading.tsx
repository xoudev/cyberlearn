import React from "react";
import { Skeleton } from "@cyberlearn/ui";
import { PageHeader } from "../../../_components/admin-ui";
import { ActionsSkeleton } from "../../../_components/data-grid-skeleton";
import { FormSkeleton } from "../../../_components/page-skeletons";
import { PATH_CRUMBS, PATH_QUIZ_HEADER } from "../../_components/path-columns";

/**
 * A path's final quiz while it loads: its settings, then its questions. The
 * path joins the trail once it is read.
 */
export default function PathQuizLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={PATH_CRUMBS}
        title={PATH_QUIZ_HEADER.title}
        description={PATH_QUIZ_HEADER.description}
        actions={<ActionsSkeleton widths={[190]} />}
      />
      <FormSkeleton rows={[2]} />
      <div className="a-stack" style={{ marginTop: 24 }} aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} h={72} />
        ))}
      </div>
    </main>
  );
}
