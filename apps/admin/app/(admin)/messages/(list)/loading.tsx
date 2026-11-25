import React from "react";
import { Card, PageHeader } from "../../_components/admin-ui";
import { LineSkeleton } from "../../_components/page-skeletons";
import { MESSAGES_HEADER } from "../_components/headers";

/** The inbox while the conversations are read: the list's rows, from the page's own header. */
export default function MessagesLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={MESSAGES_HEADER.crumbs}
        title={MESSAGES_HEADER.title}
        description={MESSAGES_HEADER.description}
      />
      <div className="a-stack" aria-hidden="true">
        <Card title="Conversations">
          <div style={{ display: "grid", gap: 18, padding: 18 }}>
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} style={{ display: "grid", gap: 8 }}>
                <LineSkeleton width={220} height={14} />
                <LineSkeleton width={420} height={12} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
