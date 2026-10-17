import React from "react";
import type { Metadata } from "next";
import { PageHeader } from "../../_components/admin-ui";
import { IMPORT_HEADER } from "../_components/lesson-headers";
import { ImportClient } from "./_components/import-client";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Importer une leçon MDX" };

export default async function ImportLessonPage(): Promise<React.ReactElement> {
  await requireAdminPage();
  return (
    <main className="a-page">
      <PageHeader
        crumbs={IMPORT_HEADER.crumbs}
        title={IMPORT_HEADER.title}
        description={IMPORT_HEADER.description}
      />

      <ImportClient />
    </main>
  );
}
