import React from "react";
import { PageHeader } from "../../_components/admin-ui";
import { FormSkeleton, LineSkeleton } from "../../_components/page-skeletons";
import { LESSON_FORM_ROWS, NEW_LESSON_HEADER } from "../_components/lesson-headers";

/** The lesson form while the page is read: every field, the editor last. */
export default function NewLessonLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={NEW_LESSON_HEADER.crumbs}
        title={NEW_LESSON_HEADER.title}
        description={<LineSkeleton width={170} height={20} />}
      />
      <FormSkeleton rows={LESSON_FORM_ROWS} />
    </main>
  );
}
