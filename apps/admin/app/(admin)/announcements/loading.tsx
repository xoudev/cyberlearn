import React from "react";
import { Card, PageHeader } from "../_components/admin-ui";
import { Bar, DataGridSkeleton } from "../_components/data-grid-skeleton";
import { ANNOUNCEMENTS_HEADER, HISTORY_COLUMNS } from "./_components/columns";

/** The announcements page while the classes and the history are read, from the page's own constants. */
export default function AnnouncementsLoading(): React.ReactElement {
  return (
    <main className="a-page">
      <PageHeader
        crumbs={ANNOUNCEMENTS_HEADER.crumbs}
        title={ANNOUNCEMENTS_HEADER.title}
        description={ANNOUNCEMENTS_HEADER.description}
      />
      <div className="a-stack" aria-hidden="true">
        <Card title="Nouvelle annonce" pad>
          <div className="a-form">
            <Bar width="100%" height={46} />
            <Bar width="100%" height={110} />
            <Bar width="100%" height={46} />
            <Bar width={320} height={18} />
            <Bar width={200} height={36} />
          </div>
        </Card>
        <DataGridSkeleton columns={HISTORY_COLUMNS} search={false} rows={5} leadLines={2} />
      </div>
    </main>
  );
}
