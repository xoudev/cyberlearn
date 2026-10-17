import React from "react";
import { Card, PageHeader } from "../../../_components/admin-ui";
import {
  FormSkeleton,
  LineSkeleton,
  TableSkeleton,
  TitleSkeleton,
} from "../../../_components/page-skeletons";
import { CHALLENGE_CRUMBS, CHALLENGE_FORM_ROWS } from "../../_components/challenge-columns";

/** A challenge while it loads: its form, then its hints. */
export default function EditChallengeLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={CHALLENGE_CRUMBS}
        title={<TitleSkeleton />}
        description={<LineSkeleton width={140} />}
      />
      <div className="a-stack">
        <Card pad>
          <FormSkeleton rows={CHALLENGE_FORM_ROWS} />
        </Card>
        <Card pad>
          <TableSkeleton columns={3} rows={3} />
        </Card>
      </div>
    </main>
  );
}
