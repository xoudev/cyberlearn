import React from "react";
import { Card, PageHeader } from "../../_components/admin-ui";
import { LineSkeleton, TitleSkeleton } from "../../_components/page-skeletons";
import { CONVERSATION_CRUMBS } from "../_components/headers";

/** A conversation while it loads: its messages, then the form to answer. */
export default function ConversationLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={CONVERSATION_CRUMBS}
        title={<TitleSkeleton width={280} />}
        description={<LineSkeleton width={240} height={18} />}
      />
      <div className="a-stack" aria-hidden="true">
        <Card title="Messages" pad>
          <div style={{ display: "grid", gap: 14 }}>
            <LineSkeleton width={360} height={56} />
            <LineSkeleton width={300} height={40} />
            <LineSkeleton width={380} height={56} />
          </div>
        </Card>
        <Card title="Répondre" pad>
          <LineSkeleton width={520} height={140} />
        </Card>
      </div>
    </main>
  );
}
