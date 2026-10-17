import React from "react";
import { PageHeader } from "../../../_components/admin-ui";
import { FormSkeleton, LineSkeleton, TitleSkeleton } from "../../../_components/page-skeletons";
import { LESSON_CRUMBS, LESSON_FORM_ROWS } from "../../_components/lesson-headers";

/** A lesson while it loads: its title and reference wait, then the form and its editor. */
export default function EditLessonLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={LESSON_CRUMBS}
        title={<TitleSkeleton width={360} />}
        description={<LineSkeleton width={220} height={20} />}
      />
      <FormSkeleton rows={LESSON_FORM_ROWS} />
    </main>
  );
}
