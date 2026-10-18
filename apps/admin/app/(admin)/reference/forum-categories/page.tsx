import React from "react";
import type { Metadata } from "next";
import { referenceRepository } from "@cyberlearn/db";
import { PageHeader } from "../../_components/admin-ui";
import { DataGrid, type GridRowBase } from "../../_components/data-grid";
import { ReferenceChrome } from "../_components/reference-chrome";
import { FORUM_CATEGORIES_HEADER, FORUM_CATEGORY_COLUMNS } from "../_components/reference-head";
import type { RawParams } from "@/lib/grid-params";
import {
  forumCategoryQueryOf,
  parseForumCategoryListParams,
  REFERENCE_PAGE_SIZE,
  referenceSearch,
} from "@/lib/reference-params";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Sections du forum" };

/** The forum's sections, read-only: the forum's migration wrote them (see ReferenceChrome). */
export default async function ReferenceForumCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}): Promise<React.ReactElement> {
  await requireAdminPage();
  const params = parseForumCategoryListParams(await searchParams);
  const slice = await referenceRepository.listForumCategories(forumCategoryQueryOf(params));

  const rows: GridRowBase[] = slice.rows.map((c) => ({
    id: c.id,
    cells: [
      <span key="n" style={{ display: "grid", gap: 2, maxWidth: 420 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* The section's own accent, as the forum draws it beside the name. */}
          <span
            aria-hidden="true"
            style={{ width: 8, height: 8, flexShrink: 0, background: c.accent }}
          />
          <span style={{ fontWeight: 600, color: "var(--a-fg)" }}>{c.name}</span>
        </span>
        <span style={{ color: "var(--a-muted)", fontSize: 12, whiteSpace: "normal" }}>
          {c.description}
        </span>
      </span>,
      <span key="s" className="mono">
        {c.slug}
      </span>,
      String(c.position),
      c._count.topics.toLocaleString("fr-FR"),
    ],
  }));

  return (
    <main className="a-page">
      <PageHeader
        crumbs={FORUM_CATEGORIES_HEADER.crumbs}
        title={FORUM_CATEGORIES_HEADER.title}
        description={FORUM_CATEGORIES_HEADER.description}
      />
      <ReferenceChrome current="forum-categories" source={FORUM_CATEGORIES_HEADER.source} />
      <DataGrid
        columns={FORUM_CATEGORY_COLUMNS}
        rows={rows}
        server={{
          path: "/reference/forum-categories",
          params: referenceSearch({ ...params, page: slice.page }),
          total: slice.total,
          page: slice.page,
          pageSize: REFERENCE_PAGE_SIZE,
        }}
        searchPlaceholder="Rechercher une section…"
        emptyTitle="Aucune section"
        emptyText="Rien ne répond à cette recherche."
      />
    </main>
  );
}
