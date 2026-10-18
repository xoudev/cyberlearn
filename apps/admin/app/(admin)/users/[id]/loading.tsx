import React from "react";
import { Skeleton } from "@cyberlearn/ui";
import { Card, PageHeader } from "../../_components/admin-ui";
import { ActionsSkeleton, KpiGridSkeleton } from "../../_components/data-grid-skeleton";
import {
  DefRowsSkeleton,
  FormSkeleton,
  LineSkeleton,
  TableSkeleton,
  TitleSkeleton,
} from "../../_components/page-skeletons";
import { USER_CARDS, USER_CRUMBS, USER_DETAIL_KPI_LABELS } from "../_components/columns";

/** The title of a card that carries a count or a state, read with the account. */
function CountedTitle({ width }: { width: number }): React.ReactElement {
  return <LineSkeleton width={width} height={10} />;
}

/** The small ghost buttons a card holds in its head, beside its title. */
function CardButtons({ widths }: { widths: readonly number[] }): React.ReactElement {
  return (
    <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
      {widths.map((width, index) => (
        <Skeleton key={index} as="span" w={width} h={28} />
      ))}
    </span>
  );
}

/** A subheading of a card (.a-subhead), the first one flush with the card's top. */
function SubheadSkeleton({
  width,
  first = false,
}: {
  width: number;
  first?: boolean;
}): React.ReactElement {
  return (
    <h3 className="a-subhead" style={first ? { marginTop: 0 } : undefined}>
      <LineSkeleton width={width} height={11} />
    </h3>
  );
}

/** A paragraph of a card's notice, lines of uneven lengths. */
function ParagraphSkeleton({ lines }: { lines: readonly string[] }): React.ReactElement {
  return (
    <div className="a-stack-tight" aria-hidden="true">
      {lines.map((width, index) => (
        <Skeleton key={index} as="span" w={width} h={12} />
      ))}
    </div>
  );
}

/**
 * An account while it loads, in the page's order. First its figures, then
 * two columns: on the left the account, its sign-in, its profile, its
 * progress, its XP, streak and badges, and its certificates; on the right
 * its ban, tickets, moderation, audit log, preferences and classes. The two
 * gestures that cannot be undone close the page. The second-factor card
 * only shows for an account that has one, which most do not, so it does not
 * wait here.
 */
export default function UserLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={USER_CRUMBS}
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            <Skeleton as="span" w={32} h={32} />
            <TitleSkeleton width={220} />
          </span>
        }
        description={<LineSkeleton width={220} />}
        actions={<ActionsSkeleton widths={[170, 190]} />}
      />
      <KpiGridSkeleton labels={USER_DETAIL_KPI_LABELS} />

      <div className="a-split">
        <div className="a-stack" style={{ alignContent: "start" }}>
          <Card title={USER_CARDS.account} pad>
            <DefRowsSkeleton count={4} />
          </Card>

          <Card title={USER_CARDS.signIn} pad>
            <DefRowsSkeleton count={4} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
              <Skeleton as="span" w={250} h={28} />
              <Skeleton as="span" w={210} h={28} />
            </div>
          </Card>

          <Card title={USER_CARDS.profile} pad>
            <DefRowsSkeleton count={1} />
            <FormSkeleton rows={[1, 1, { height: 80 }]} submit={170} />
            <div className="a-form" style={{ marginTop: 18 }} aria-hidden="true">
              <LineSkeleton width={110} height={10} />
              <CardButtons widths={[150, 140, 120, 130]} />
            </div>
          </Card>

          <Card title={USER_CARDS.progress} action={<LineSkeleton width={190} height={11} />}>
            <div className="a-card-pad" aria-hidden="true">
              <SubheadSkeleton width={160} first />
              <ParagraphSkeleton lines={["92%", "55%"]} />
              <div style={{ marginTop: 12 }}>
                <Skeleton as="span" w={240} h={28} />
              </div>
              <SubheadSkeleton width={150} />
              <TableSkeleton columns={3} rows={2} />
              <SubheadSkeleton width={120} />
              <TableSkeleton columns={2} rows={4} />
              <SubheadSkeleton width={130} />
              <ParagraphSkeleton lines={["96%", "90%", "70%"]} />
              <div style={{ marginTop: 12 }}>
                <FormSkeleton rows={[1, { height: 52 }]} submit={150} />
              </div>
            </div>
          </Card>

          {/* Its four gestures, folded: one line each until opened. */}
          <Card title={USER_CARDS.gamification} pad>
            <div className="a-stack-tight" aria-hidden="true">
              {[200, 150, 210, 120].map((width, index) => (
                <div key={index} className="a-disclosure">
                  <div className="a-disclosure-head">
                    <LineSkeleton width={width} height={12} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title={<CountedTitle width={130} />}>
            <TableSkeleton columns={3} rows={1} />
          </Card>
        </div>

        <div className="a-stack" style={{ alignContent: "start" }}>
          <Card title={<CountedTitle width={110} />} pad>
            <FormSkeleton rows={[1, { height: 110 }]} submit={150} />
          </Card>

          <Card title={<CountedTitle width={80} />} action={<CardButtons widths={[120]} />}>
            <TableSkeleton columns={3} rows={2} />
          </Card>

          <Card title={USER_CARDS.moderation} action={<CardButtons widths={[50, 120]} />}>
            <div className="a-card-pad" aria-hidden="true">
              <SubheadSkeleton width={230} first />
              <TableSkeleton columns={3} rows={2} />
              <SubheadSkeleton width={130} />
              <TableSkeleton columns={3} rows={1} />
            </div>
          </Card>

          <Card title={USER_CARDS.audit} action={<CardButtons widths={[120, 140]} />}>
            <TableSkeleton columns={3} rows={4} />
          </Card>

          <Card title={USER_CARDS.preferences}>
            <DefRowsSkeleton count={11} />
          </Card>

          <Card title={<CountedTitle width={90} />}>
            <TableSkeleton columns={3} rows={1} />
          </Card>
        </div>
      </div>

      <div className="a-stack" style={{ marginTop: 18 }}>
        <Card title={USER_CARDS.resetProgress} pad>
          <ParagraphSkeleton lines={["96%", "94%", "90%", "40%"]} />
          <div style={{ marginTop: 16 }}>
            <FormSkeleton rows={[1]} submit={260} />
          </div>
        </Card>

        <Card title={USER_CARDS.danger} pad>
          <ParagraphSkeleton lines={["90%", "60%"]} />
          <div style={{ marginTop: 16 }}>
            <FormSkeleton rows={[1, 1]} submit={200} />
          </div>
        </Card>
      </div>
    </main>
  );
}
