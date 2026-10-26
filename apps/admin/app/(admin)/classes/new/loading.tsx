import React from "react";
import { Card, PageHeader } from "../../_components/admin-ui";
import { ActionsSkeleton } from "../../_components/data-grid-skeleton";
import { FormSkeleton, LineSkeleton } from "../../_components/page-skeletons";
import { NEW_CLASS_HEADER } from "../_components/class-columns";

/** The three creation forms side by side, while the schools and their years are read. */
export default function NewClassLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={NEW_CLASS_HEADER.crumbs}
        title={NEW_CLASS_HEADER.title}
        description={NEW_CLASS_HEADER.description}
        actions={<ActionsSkeleton widths={[190]} />}
      />
      <div className="admin-compose-grid">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={index} title={<LineSkeleton width={120} height={10} />} pad>
            <FormSkeleton rows={[1, 1, 1, 1]} submit={140} />
          </Card>
        ))}
      </div>
    </main>
  );
}
