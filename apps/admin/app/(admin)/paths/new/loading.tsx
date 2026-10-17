import React from "react";
import { PageHeader } from "../../_components/admin-ui";
import { FormSkeleton, LineSkeleton } from "../../_components/page-skeletons";
import { NEW_PATH_HEADER, PATH_FORM_ROWS } from "../_components/path-columns";

/** The path form while the lessons it can string together are read. */
export default function NewPathLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={NEW_PATH_HEADER.crumbs}
        title={NEW_PATH_HEADER.title}
        description={<LineSkeleton width={170} height={20} />}
      />
      <FormSkeleton rows={PATH_FORM_ROWS} />
    </main>
  );
}
