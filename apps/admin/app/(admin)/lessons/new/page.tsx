import type React from "react";
import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { learnerLessonUrlPrefix } from "@/lib/learner-url";
import { PageHeader, Tag } from "../../_components/admin-ui";
import { CONTENT_STATUS } from "../../_components/content-status";
import { NewLessonForm } from "./_components/new-lesson-form";

export const metadata: Metadata = { title: "Nouvelle leçon" };

// The form is a client component and cannot check anything itself; the page
// in front of it does, as every console page does (see requireAdminPage).
export default async function NewLessonPage(): Promise<React.ReactElement> {
  await requireAdminPage();
  return (
    <main className="a-page">
      <PageHeader
        crumbs={[{ label: "Contenu" }, { label: "Leçons", href: "/lessons" }]}
        title="Créer une leçon"
        description={<Tag tone={CONTENT_STATUS.DRAFT.tone}>Brouillon · non publié</Tag>}
      />
      <NewLessonForm lessonUrlPrefix={learnerLessonUrlPrefix()} />
    </main>
  );
}
