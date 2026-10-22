import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/** Same structure and cover height as the server-rendered catalogue. */
export function LessonsBodySkeleton(): React.ReactElement {
  return (
    <div aria-busy="true" aria-label="Chargement des leçons" style={{ display: "contents" }}>
      <div className="catalogue-heading" aria-hidden="true">
        <div>
          <Skeleton w={130} h={12} style={{ marginBottom: 22 }} />
          <Skeleton w="65%" h={72} style={{ marginBottom: 8 }} />
          <Skeleton w="85%" h={72} style={{ marginBottom: 24 }} />
          <SkeletonText lines={2} lastWidth="65%" lineHeight={15} gap={10} />
        </div>
        <div className="catalogue-summary">
          <Skeleton w={100} h={72} />
          <Skeleton w="85%" h={14} style={{ marginBlock: 24 }} />
          <SkeletonText lines={2} lastWidth="75%" lineHeight={12} gap={8} />
        </div>
      </div>
      <div className="catalogue-tools" aria-hidden="true">
        <div className="lessons-catalogue__domains">
          {[80, 82, 100, 90].map((w) => (
            <Skeleton key={w} w={w} h={44} />
          ))}
        </div>
        <div className="lessons-catalogue__refine">
          {[0, 1, 2].map((n) => (
            <Skeleton key={n} w="100%" h={46} />
          ))}
        </div>
      </div>
      <div className="catalogue-results" aria-hidden="true">
        <Skeleton w={180} h={30} />
      </div>
      <div className="lessons-catalogue__grid" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <div className="catalogue-lesson" key={n}>
            <Skeleton w="100%" h={144} />
            <div className="catalogue-lesson__body">
              <Skeleton w="55%" h={12} style={{ marginBottom: 24 }} />
              <Skeleton w="80%" h={32} style={{ marginBottom: 16 }} />
              <SkeletonText lines={3} lastWidth="65%" lineHeight={13} gap={9} />
              <Skeleton w="100%" h={44} style={{ marginTop: 24 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
