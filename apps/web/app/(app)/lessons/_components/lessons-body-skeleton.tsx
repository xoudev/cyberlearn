import React from "react";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

/**
 * Loading placeholder for the lessons catalog body (header + filters + cards).
 * Shared by `loading.tsx` (which adds the breadcrumb) and the in-page
 * `<Suspense>` fallback, so there is one source of truth. Dimensions mirror the
 * real catalog to avoid layout shift.
 */
export function LessonsBodySkeleton(): React.ReactElement {
  return (
    <>
      {/* Header */}
      <div className="catalog-header-grid" style={{ marginBottom: 32 }}>
        <div>
          <Skeleton h={52} w="40%" style={{ marginBottom: 14 }} />
          <Skeleton h={14} w="70%" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Skeleton h={11} w="55%" />
          <Skeleton h={11} w="40%" />
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 24, alignItems: "center" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} w={90} h={34} />
        ))}
      </div>

      {/* Cards grid */}
      <div className="lessons-catalog-grid">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonCard
            key={i}
            style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <Skeleton w={64} h={20} radius="pill" />
              <Skeleton w={80} h={20} radius="pill" />
            </div>
            <Skeleton h={16} w="85%" />
            <Skeleton h={13} w="65%" />
            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              <Skeleton w={44} h={12} />
              <Skeleton w={56} h={12} />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </>
  );
}
