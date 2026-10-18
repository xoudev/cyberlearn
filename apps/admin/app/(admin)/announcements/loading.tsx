import React from "react";
import { Card, PageHeader } from "../_components/admin-ui";
import { DataGridSkeleton } from "../_components/data-grid-skeleton";
import { FormSkeleton } from "../_components/page-skeletons";
import { ANNOUNCEMENTS_HEADER, HISTORY_COLUMNS } from "./_components/columns";

/** The announcements page while the classes and the history are read, from the page's own constants. */
export default function AnnouncementsLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={ANNOUNCEMENTS_HEADER.crumbs}
        title={ANNOUNCEMENTS_HEADER.title}
        description={ANNOUNCEMENTS_HEADER.description}
      />
      <div className="a-stack">
        <Card title="Nouvelle annonce" pad>
          {/* Title, message, link, then the row of audience choices. */}
          <FormSkeleton rows={[1, { height: 110 }, 1, { height: 18 }]} submit={200} />
        </Card>
        <DataGridSkeleton columns={HISTORY_COLUMNS} search={false} rows={5} leadLines={2} />
      </div>
    </main>
  );
}
