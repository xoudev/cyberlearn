import type React from "react";
import { requireAdminPage } from "@/lib/auth";
import { NewLessonForm } from "./_components/new-lesson-form";

// The form is a client component and cannot check anything itself; the page
// in front of it does, as every console page does (see requireAdminPage).
export default async function NewLessonPage(): Promise<React.ReactElement> {
  await requireAdminPage();
  return <NewLessonForm />;
}
