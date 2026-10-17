import React from "react";
import type { Metadata } from "next";
import { GhostLink, PageHeader } from "../../_components/admin-ui";
import { PATH_ARCHIVES_HEADER } from "../_components/path-columns";
import { PathsGrid } from "../_components/paths-grid";
import { listPaths } from "@/lib/services/path-list.service";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Parcours archivés" };

export default async function ArchivedPathsPage(): Promise<React.ReactElement> {
  await requireAdminPage();
  const { rows } = await listPaths("archives");

  return (
    <main className="a-page">
      <PageHeader
        crumbs={PATH_ARCHIVES_HEADER.crumbs}
        title={`${PATH_ARCHIVES_HEADER.title} (${String(rows.length)})`}
        description={PATH_ARCHIVES_HEADER.description}
        actions={<GhostLink href="/paths">Retour aux parcours</GhostLink>}
      />

      <PathsGrid paths={rows} folder="archives" />
    </main>
  );
}
