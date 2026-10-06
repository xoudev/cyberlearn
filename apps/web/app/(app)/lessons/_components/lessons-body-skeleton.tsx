import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * The lessons catalogue below its breadcrumb while it loads, drawn on the
 * page's own classes: the header grid and its counts, the filter bar (domain
 * pills, the two selects, the search), then the grid of lesson cards, each
 * with its cover image. Shared by `loading.tsx`, which adds the breadcrumb,
 * and the page's `<Suspense>` fallback, which sits under the real one.
 */

/** One catalogue `LessonCard`: tags, the 16/9 cover, title, two lines, footer. */
function LessonCardSkeleton(): React.ReactElement {
  return (
    <div className="card" style={{ height: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px 10px",
        }}
      >
        <Skeleton w={70} h={18} />
        <Skeleton w={104} h={18} />
      </div>
      <Skeleton style={{ aspectRatio: "16 / 9", margin: "0 16px" }} />
      <div style={{ padding: "16px 16px 18px" }}>
        <Skeleton w="82%" h={16} style={{ marginBottom: 12 }} />
        <SkeletonText lines={2} lastWidth="58%" lineHeight={11} gap={9} />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderTop: "1px solid var(--color-border-subtle)",
        }}
      >
        <Skeleton w={64} h={11} />
        <Skeleton w={48} h={11} />
        <Skeleton w={84} h={11} />
      </div>
    </div>
  );
}

export function LessonsBodySkeleton(): React.ReactElement {
  return (
    <>
      <div className="catalog-header-grid" aria-hidden="true">
        <div>
          {/* The h1: clamp(42px, 5vw, 68px), "N missions" over "disponibles". */}
          <Skeleton w="72%" h="clamp(36px, 4.3vw, 58px)" style={{ marginBottom: 7 }} />
          <Skeleton w="62%" h="clamp(36px, 4.3vw, 58px)" style={{ marginBottom: 14 }} />
          <SkeletonText
            lines={2}
            lastWidth="60%"
            lineHeight={15}
            gap={10}
            style={{ maxWidth: 520 }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 18 }}>
            <Skeleton w={72} h={10} />
            <Skeleton w={84} h={10} />
            <Skeleton w={100} h={10} />
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            <Skeleton w={216} h={10} />
            <Skeleton w={90} h={10} />
          </div>
        </div>
      </div>

      <div className="filter-bar" aria-hidden="true">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Skeleton w={76} h={10} style={{ marginRight: 6 }} />
          {[113, 138, 99, 123].map((w) => (
            <Skeleton key={w} w={w} h={34} />
          ))}
        </div>
        <Skeleton w={160} h={34} />
        <Skeleton w={130} h={34} />
        <Skeleton w={220} h={34} />
      </div>

      <div className="lessons-catalog-grid" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <LessonCardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}
