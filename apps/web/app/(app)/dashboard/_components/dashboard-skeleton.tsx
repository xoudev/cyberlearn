import React from "react";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

/**
 * Loading placeholder for the dashboard. Shared by both `loading.tsx` (route
 * navigation) and the in-page `<Suspense>` fallback so there is a single
 * source of truth: no per-page skeleton duplication. Dimensions mirror the
 * real content (status strip, hero grid, sections) to avoid layout shift.
 */
export function DashboardSkeleton(): React.ReactElement {
  return (
    <div className="page-container" style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      {/* Status strip */}
      <Skeleton h={13} w="55%" />

      {/* Hero grid */}
      <div className="dash-hero-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Skeleton h={12} w={140} />
          <Skeleton h={80} w="55%" />
          <Skeleton h={14} w="50%" />
        </div>
        <SkeletonCard style={{ borderRadius: 0, padding: 28 }}>
          <Skeleton h={12} w="35%" style={{ marginBottom: 14 }} />
          <Skeleton h={96} w="30%" style={{ marginBottom: 14 }} />
          <Skeleton h={12} w="100%" style={{ marginBottom: 8 }} />
          <Skeleton h={10} w="65%" />
        </SkeletonCard>
      </div>

      {/* Continue section */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Skeleton h={36} w="30%" />
        <SkeletonCard style={{ height: 200, borderRadius: 0 }} />
      </div>

      {/* Reviews section */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Skeleton h={36} w="30%" />
        <div style={{ border: "1px solid #2a2560" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                padding: "18px 24px",
                borderBottom: i < 2 ? "1px solid #2a2560" : "none",
                display: "flex",
                gap: 16,
                alignItems: "center",
              }}
            >
              <Skeleton w={44} h={44} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <Skeleton h={14} w="75%" />
                <Skeleton h={11} w="45%" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
