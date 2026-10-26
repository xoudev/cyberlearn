import React from "react";
import { Skeleton } from "@cyberlearn/ui";
import { Card, PageHeader } from "../_components/admin-ui";
import { LineSkeleton } from "../_components/page-skeletons";
import { LAB_CARDS, LAB_HEADER } from "./_components/lab-head";

/** The bench while the e-mail samples render: its three cards, contents waiting. */
export default function LabLoading(): React.ReactElement {
  const tag = <LineSkeleton width={110} height={18} />;
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={LAB_HEADER.crumbs}
        title={LAB_HEADER.title}
        description={LAB_HEADER.description}
      />

      <div className="a-stack" aria-hidden="true">
        <Card title={LAB_CARDS.wrapped} action={tag} pad>
          <div className="a-stack-tight">
            <Skeleton as="span" w="80%" h={13} />
            <Skeleton as="span" w="55%" h={13} />
          </div>
          <Skeleton w={220} h={40} style={{ marginTop: 12 }} />
        </Card>

        <Card title={LAB_CARDS.moderation} action={tag} pad>
          <div className="a-stack-tight">
            <Skeleton as="span" w={120} h={10} />
            <Skeleton h={110} />
            <Skeleton w={110} h={32} />
          </div>
        </Card>

        <Card title={LAB_CARDS.emails} action={tag} pad>
          <div className="a-stack-tight">
            <Skeleton w={260} h={36} />
            <Skeleton as="span" w="60%" h={10} />
            <Skeleton h={480} />
          </div>
        </Card>
      </div>
    </main>
  );
}
