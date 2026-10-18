import React from "react";
import { Skeleton } from "@cyberlearn/ui";
import { PageHeader } from "../../_components/admin-ui";
import { ActionsSkeleton, DataGridSkeleton } from "../../_components/data-grid-skeleton";
import { CONTENT_COLUMNS } from "../_components/content-columns";
import { CONTENT_HEADER } from "../_components/moderation-head";

/** The surface links, each the width of its label, at the height of a small button. */
const SURFACE_PILL_WIDTHS = [150, 170, 170, 140, 160] as const;

/**
 * The published-content list while it loads: its header, the five surfaces to
 * pick from, and its grid, from the page's own constants.
 */
export default function AdminContentLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={CONTENT_HEADER.crumbs}
        title={CONTENT_HEADER.title}
        description={CONTENT_HEADER.description}
        actions={<ActionsSkeleton widths={[160]} />}
      />
      <div
        aria-hidden="true"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}
      >
        {SURFACE_PILL_WIDTHS.map((width, index) => (
          <Skeleton key={index} as="span" w={width} h={32} />
        ))}
      </div>
      <DataGridSkeleton columns={CONTENT_COLUMNS} facets={1} rows={10} />
    </main>
  );
}
