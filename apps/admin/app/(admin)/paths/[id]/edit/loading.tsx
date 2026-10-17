import React from "react";
import { Card, PageHeader } from "../../../_components/admin-ui";
import { ActionsSkeleton } from "../../../_components/data-grid-skeleton";
import {
  FormSkeleton,
  LineSkeleton,
  TableSkeleton,
  TitleSkeleton,
} from "../../../_components/page-skeletons";
import { PATH_CRUMBS, PATH_FORM_ROWS } from "../../_components/path-columns";

/** A path while it loads: its form, then what learners said about it. */
export default function EditPathLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={PATH_CRUMBS}
        title={<TitleSkeleton width={320} />}
        description={<LineSkeleton width={220} height={20} />}
        actions={<ActionsSkeleton widths={[200]} />}
      />
      <FormSkeleton rows={PATH_FORM_ROWS} />
      <div style={{ marginTop: 24 }}>
        <Card title={<LineSkeleton width={180} height={10} />} pad>
          <TableSkeleton columns={4} rows={3} />
        </Card>
      </div>
    </main>
  );
}
