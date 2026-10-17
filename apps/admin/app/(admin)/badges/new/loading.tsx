import React from "react";
import { PageHeader } from "../../_components/admin-ui";
import { ActionsSkeleton } from "../../_components/data-grid-skeleton";
import { FormSkeleton } from "../../_components/page-skeletons";
import { BADGE_FORM_ROWS, NEW_BADGE_HEADER } from "../_components/badge-columns";

/** The badge form while the lessons and paths it can point to are read. */
export default function NewBadgeLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={NEW_BADGE_HEADER.crumbs}
        title={NEW_BADGE_HEADER.title}
        actions={<ActionsSkeleton widths={[190]} />}
      />
      <FormSkeleton rows={BADGE_FORM_ROWS} />
    </main>
  );
}
