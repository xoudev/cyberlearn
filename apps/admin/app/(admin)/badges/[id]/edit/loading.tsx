import React from "react";
import { PageHeader } from "../../../_components/admin-ui";
import { ActionsSkeleton } from "../../../_components/data-grid-skeleton";
import { FormSkeleton, LineSkeleton, TitleSkeleton } from "../../../_components/page-skeletons";
import { BADGE_CRUMBS, BADGE_FORM_ROWS } from "../../_components/badge-columns";

/** A badge while it loads: its name and reference wait, and the form under them. */
export default function EditBadgeLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={BADGE_CRUMBS}
        title={<TitleSkeleton />}
        description={<LineSkeleton width={300} />}
        actions={<ActionsSkeleton widths={[130, 190]} />}
      />
      <FormSkeleton rows={BADGE_FORM_ROWS} />
    </main>
  );
}
