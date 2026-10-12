import React from "react";
import type { Metadata } from "next";
import { PageHeader } from "../../_components/admin-ui";
import { ImportClient } from "./_components/import-client";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Importer une leçon MDX" };

export default async function ImportLessonPage(): Promise<React.ReactElement> {
  await requireAdminPage();
  return (
    <main className="a-page">
      <PageHeader
        crumbs={[{ label: "Contenu" }, { label: "Leçons", href: "/lessons" }]}
        title="Importer une leçon MDX"
        description="Format : frontmatter YAML + corps MDX · 500 Ko au plus · extension .mdx uniquement"
      />

      <ImportClient />
    </main>
  );
}
