import React from "react";
import { Skeleton } from "@cyberlearn/ui";
import { PageHeader } from "../../_components/admin-ui";
import { IMPORT_HEADER } from "../_components/lesson-headers";

/**
 * The import while its client loads: the drop zone and the file list, the
 * editor, the metadata, in the panes .import-grid lays out.
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
        <div className="import-files">
          <Skeleton h={130} />
          <Skeleton h={44} />
          <Skeleton h={44} />
        </div>
        <div className="import-editor">
          <Skeleton style={{ flex: 1 }} />
        </div>
        <div className="import-preview" style={{ minHeight: 200 }}>
          <Skeleton style={{ flex: 1 }} />
        </div>
      </div>
    </main>
  );
}
