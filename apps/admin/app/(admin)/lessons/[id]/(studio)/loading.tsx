import React from "react";
import { Skeleton } from "@cyberlearn/ui";
import { PageHeader } from "../../../_components/admin-ui";
import { LineSkeleton, TitleSkeleton } from "../../../_components/page-skeletons";
import { LESSON_CRUMBS } from "../../_components/lesson-headers";

/**
 * A lesson while it loads: its title and reference wait, then the studio's
 * bar, its folded fields and versions, and the editor under them, in the
 * studio's own grid.
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
            <Skeleton as="span" w={170} h={44} />
            <Skeleton as="span" w={190} h={44} />
          </span>
        </div>
        <div className="a-studio-body">
          <Skeleton h={46} />
          <Skeleton h={46} />
          <div className="a-studio-editor">
            <Skeleton h="100%" />
          </div>
        </div>
      </div>
    </main>
  );
}
