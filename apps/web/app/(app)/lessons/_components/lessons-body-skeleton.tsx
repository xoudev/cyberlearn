import React from "react";
import { Skeleton, SkeletonText } from "@cyberlearn/ui";

/** Reserve the masthead, domain choices and lesson cards while the catalogue streams. */
export function LessonsBodySkeleton(): React.ReactElement {
  return (
    <div aria-busy="true" aria-label="Chargement des leçons" style={{ display: "contents" }}>
      <div className="catalogue-masthead" aria-hidden="true">
        <div>
          <Skeleton w={140} h={12} style={{ marginBottom: 22 }} />
          <Skeleton w="min(70vw, 500px)" h={72} style={{ marginBottom: 18 }} />
          <Skeleton w="min(65vw, 350px)" h={14} />
        </div>
        <Skeleton w={160} h={60} />
      </div>
      <div className="catalogue-ledger" aria-hidden="true">
        <Skeleton w={100} h={24} />
        <Skeleton w={100} h={24} />
      </div>
      <div className="lessons-catalogue__workspace" aria-hidden="true" style={{ marginTop: 28 }}>
        <div className="lessons-catalogue__filters">
          <Skeleton w={80} h={12} style={{ marginBottom: 18 }} />
          <div className="lessons-catalogue__domains">
            {[0, 1, 2, 3].map((n) => (
              <Skeleton key={n} w="100%" h={100} />
            ))}
          </div>
          <div className="lessons-catalogue__refine">
            {[0, 1, 2].map((n) => (
              <Skeleton key={n} w="100%" h={46} />
            ))}
          </div>
        </div>
        <div>
          <div className="catalogue-results" style={{ marginTop: 0 }}>
            <Skeleton w={180} h={30} />
          </div>
          <div className="lessons-catalogue__grid">
            {[0, 1, 2, 3].map((n) => (
              <div className="catalogue-lesson" key={n}>
                <div className="catalogue-lesson__cover">
                  <Skeleton w="100%" h={32} />
                </div>
                <div className="catalogue-lesson__body">
                  <div className="catalogue-lesson__copy">
                    <Skeleton w="50%" h={12} style={{ marginBottom: 18 }} />
                    <Skeleton w="85%" h={32} style={{ marginBottom: 14 }} />
                    <SkeletonText lines={1} lastWidth="65%" lineHeight={12} gap={8} />
                  </div>
                  <div className="catalogue-lesson__aside">
                    <Skeleton w="80%" h={12} />
                    <Skeleton w="100%" h={44} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
