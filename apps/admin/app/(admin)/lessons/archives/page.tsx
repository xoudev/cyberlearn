import React from "react";
import type { Metadata } from "next";
import { GhostLink, PageHeader } from "../../_components/admin-ui";
import { LessonsTable } from "../_components/lessons-table";
import { listLessons } from "@/lib/services/lesson-list.service";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Leçons archivées" };

export default async function ArchivedLessonsPage(): Promise<React.ReactElement> {
  await requireAdminPage();
  const { rows } = await listLessons("archives");

  return (
    <main className="admin-page-content">
      <PageHeader
        eyebrow="Contenu"
        title={`Leçons archivées (${String(rows.length)})`}
        description="Invisibles sur le site et dans l'app. Les progressions et les réponses de ceux qui les ont suivies sont conservées. Une leçon remise en brouillon retourne dans la liste des leçons."
        actions={<GhostLink href="/lessons">Retour aux leçons</GhostLink>}
      />

      <LessonsTable lessons={rows} folder="archives" />
    </main>
  );
}
