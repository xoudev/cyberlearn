import type React from "react";
import type { Metadata } from "next";
import { lessonRepository, pathRepository } from "@cyberlearn/db";
import { requireAdminPage } from "@/lib/auth";
import { learnerLessonUrlPrefix } from "@/lib/learner-url";
import { PageHeader, Tag } from "../../_components/admin-ui";
import { CONTENT_STATUS } from "../../_components/content-status";
import { NEW_LESSON_HEADER } from "../_components/lesson-headers";
import { NewLessonForm } from "./_components/new-lesson-form";

export const metadata: Metadata = { title: "Nouvelle leçon" };

// The form is a client component and cannot check anything itself; the page
// in front of it does, as every console page does (see requireAdminPage).
export default async function NewLessonPage(): Promise<React.ReactElement> {
  await requireAdminPage();

  // What the lesson can be put in and made to require: the catalogue's paths
  // and lessons, archives left aside.
  const [pathOptions, lessonOptions] = await Promise.all([
    pathRepository.findCatalogueOptions(),
    lessonRepository.findPrerequisiteOptions(),
  ]);

  return (
    <main className="a-page">
      <PageHeader
        crumbs={NEW_LESSON_HEADER.crumbs}
        title={NEW_LESSON_HEADER.title}
        description={<Tag tone={CONTENT_STATUS.DRAFT.tone}>Brouillon · non publié</Tag>}
      />
      <NewLessonForm
        lessonUrlPrefix={learnerLessonUrlPrefix()}
        pathOptions={pathOptions}
        lessonOptions={lessonOptions}
      />
    </main>
  );
}
