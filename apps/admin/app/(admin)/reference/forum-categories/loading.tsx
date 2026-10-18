import React from "react";
import { PageHeader } from "../../_components/admin-ui";
import { DataGridSkeleton } from "../../_components/data-grid-skeleton";
import { ReferenceChrome } from "../_components/reference-chrome";
import { FORUM_CATEGORIES_HEADER, FORUM_CATEGORY_COLUMNS } from "../_components/reference-head";

/** The forum's sections while they load: a search box, no filter, the rows waiting. */
export default function ReferenceForumCategoriesLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={FORUM_CATEGORIES_HEADER.crumbs}
        title={FORUM_CATEGORIES_HEADER.title}
        description={FORUM_CATEGORIES_HEADER.description}
      />
      <ReferenceChrome current="forum-categories" source={FORUM_CATEGORIES_HEADER.source} />
      <DataGridSkeleton columns={FORUM_CATEGORY_COLUMNS} rows={6} leadLines={2} />
    </main>
  );
}
