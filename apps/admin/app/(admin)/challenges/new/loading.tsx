import React from "react";
import { Card, PageHeader } from "../../_components/admin-ui";
import { FormSkeleton } from "../../_components/page-skeletons";
import { CHALLENGE_FORM_ROWS, NEW_CHALLENGE_HEADER } from "../_components/challenge-columns";

/** The challenge form while the possible prerequisites are read. */
export default function NewChallengeLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader crumbs={NEW_CHALLENGE_HEADER.crumbs} title={NEW_CHALLENGE_HEADER.title} />
      <Card pad>
        <FormSkeleton rows={CHALLENGE_FORM_ROWS} />
      </Card>
    </main>
  );
}
