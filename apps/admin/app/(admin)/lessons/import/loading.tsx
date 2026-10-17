import React from "react";
import { Skeleton } from "@cyberlearn/ui";
import { PageHeader } from "../../_components/admin-ui";
import { IMPORT_HEADER } from "../_components/lesson-headers";

/**
 * The import while its client loads: the drop zone and the file list, the
 * source, the preview, side by side as .import-grid lays them out.
 */
export default function ImportLessonLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={IMPORT_HEADER.crumbs}
        title={IMPORT_HEADER.title}
        description={IMPORT_HEADER.description}
      />
      <div className="import-grid" aria-hidden="true">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Skeleton h={130} />
          <Skeleton h={44} />
          <Skeleton h={44} />
        </div>
        <Skeleton h="100%" style={{ minHeight: 320 }} />
        <Skeleton h="100%" style={{ minHeight: 320 }} />
      </div>
    </main>
  );
}
