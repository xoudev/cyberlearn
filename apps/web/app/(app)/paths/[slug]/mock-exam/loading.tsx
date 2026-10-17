import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import "./_components/mock-exam.css";

/**
 * The mock exam while its page loads, drawn on the opening's own classes
 * (mock-exam.css) at their real sizes: the breadcrumb, then the frame with
 * the eyebrow, the path's name, the line that says the paper is being drawn
 * and the way back. What the exam covers is in the window on the path's
 * page, which led here.
 */
export default function MockExamLoading(): React.ReactElement {
  return (
    <div className="page-container mkx" aria-busy="true" aria-label="Chargement de l'examen blanc">
      <Skeleton w={320} h={14} style={{ maxWidth: "100%", marginBottom: 26 }} />

      <div className="mkx-open" aria-hidden="true">
        <div className="mkx-eyebrow">
          <Skeleton w={140} h={12} />
        </div>
        {/* .pg-title here: clamp(32px, 4vw, 52px); the paths' titles (21-30
            characters) wrap to two lines at that size. */}
        <Skeleton w="82%" h="clamp(30px, 3.8vw, 48px)" style={{ marginBottom: 8 }} />
        <Skeleton w="46%" h="clamp(30px, 3.8vw, 48px)" style={{ marginBottom: 24 }} />
        <Skeleton w={210} h={12} style={{ marginBottom: 30 }} />
        <div className="mkx-cta">
          <Skeleton w={160} h={11} style={{ alignSelf: "center" }} />
        </div>
      </div>
    </div>
  );
}
