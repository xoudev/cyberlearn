import React from "react";
import { Card, PageHeader } from "../_components/admin-ui";
import { DefRowsSkeleton, LineSkeleton } from "../_components/page-skeletons";
import { ACCOUNT_CARDS, ACCOUNT_HEADER } from "./_components/account-head";

/** « Mon compte » while the account and its sign-in are read: the four cards, their rows waiting. */
export default function AccountLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={ACCOUNT_HEADER.crumbs}
        title={ACCOUNT_HEADER.title}
        description={ACCOUNT_HEADER.description}
      />

      <div className="admin-settings-grid">
        <Card title={ACCOUNT_CARDS.identity}>
          <DefRowsSkeleton count={5} />
        </Card>
        <Card title={ACCOUNT_CARDS.signIn} action={<LineSkeleton width={170} height={40} />}>
          <DefRowsSkeleton count={3} />
        </Card>
        <Card title={ACCOUNT_CARDS.actions} pad>
          <LineSkeleton width={320} />
        </Card>
        <Card title={ACCOUNT_CARDS.sessions} pad>
          <LineSkeleton width={360} />
        </Card>
      </div>
    </main>
  );
}
