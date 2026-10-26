import React from "react";
import { Skeleton } from "@cyberlearn/ui";
import { Card, PageHeader } from "../../_components/admin-ui";
import { ActionsSkeleton } from "../../_components/data-grid-skeleton";
import { LineSkeleton, TitleSkeleton } from "../../_components/page-skeletons";
import { TICKET_CARDS, TICKET_CRUMBS } from "../_components/ticket-columns";

/**
 * A ticket while it loads: the message beside its status, the team's notes
 * and the details, then the conversation. The card of a contested ban is left
 * out: only the read says whether the ticket is an appeal.
 */
export default function TicketLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={TICKET_CRUMBS}
        title={<TitleSkeleton width={360} />}
        description={<LineSkeleton width={260} height={18} />}
        actions={<ActionsSkeleton widths={[170]} />}
      />

      <div className="a-split" aria-hidden="true">
        <div style={{ alignSelf: "start", minWidth: 0 }}>
          <Card title={TICKET_CARDS.message}>
            <div className="a-stack-tight" style={{ padding: 18 }}>
              <Skeleton as="span" w="95%" h={14} />
              <Skeleton as="span" w="88%" h={14} />
              <Skeleton as="span" w="92%" h={14} />
              <Skeleton as="span" w="60%" h={14} />
            </div>
          </Card>
        </div>

        <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <Card title={TICKET_CARDS.status} pad>
            <div style={{ display: "grid", gap: 13 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <Skeleton as="span" w={140} h={32} />
                <Skeleton as="span" w={150} h={10} />
              </div>
              {/* Who has it in hand. */}
              <span style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
                <Skeleton as="span" w={80} h={9} />
                <Skeleton as="span" w={140} h={28} />
              </span>
            </div>
          </Card>

          <Card title={TICKET_CARDS.notes} pad>
            <div style={{ display: "grid", gap: 12 }}>
              <Skeleton as="span" w="80%" h={11} />
              <Skeleton h={64} />
              <Skeleton as="span" w={130} h={32} />
            </div>
          </Card>

          <Card title={TICKET_CARDS.details} pad>
            <div style={{ display: "grid", gap: 13 }}>
              {Array.from({ length: 5 }, (_, index) => (
                <span key={index} style={{ display: "grid", gap: 4 }}>
                  <Skeleton as="span" w={80} h={9} />
                  <Skeleton as="span" w={index % 2 === 0 ? 180 : 130} h={12} />
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card title={TICKET_CARDS.conversation}>
        <div className="a-stack" style={{ padding: 18 }} aria-hidden="true">
          <Skeleton h={80} />
          <Skeleton h={80} />
          <Skeleton h={120} />
        </div>
      </Card>
    </main>
  );
}
