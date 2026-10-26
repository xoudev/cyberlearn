import React from "react";
import { Skeleton } from "@cyberlearn/ui";
import { PageHeader } from "../../../_components/admin-ui";
import { FormSkeleton, LineSkeleton, TitleSkeleton } from "../../../_components/page-skeletons";
import { LESSON_CRUMBS, LESSON_STUDIO_RAIL_ROWS } from "../../_components/lesson-headers";

/**
 * A lesson while it loads: its title and reference wait, then the studio's
 * bar, its rail of fields and the editor beside it, in the studio's own grid.
 */
export default function LessonStudioLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true" data-width="full">
      <PageHeader
        crumbs={LESSON_CRUMBS}
        title={<TitleSkeleton width={360} />}
        description={<LineSkeleton width={220} height={20} />}
      />
      <div className="a-studio" aria-hidden="true">
        <div className="a-studio-bar">
          <LineSkeleton width={220} />
          <span className="a-studio-actions">
            <Skeleton as="span" w={170} h={32} />
            <Skeleton as="span" w={190} h={32} />
          </span>
        </div>
        <div className="a-studio-body">
          <div className="a-studio-rail">
            <FormSkeleton rows={LESSON_STUDIO_RAIL_ROWS} submit={0} />
          </div>
          <div className="a-studio-editor">
            <Skeleton h="100%" />
          </div>
        </div>
      </div>
    </main>
  );
}
