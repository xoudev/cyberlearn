import React from "react";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

/**
 * Loading placeholder for the dashboard. Shared by both `loading.tsx` (route
 * navigation) and the in-page `<Suspense>` fallback so there is a single
 * source of truth: no per-page skeleton duplication. Dimensions mirror the
 * real content (hero, mission card, two columns) to avoid layout shift.
 */
export function DashboardSkeleton(): React.ReactElement {
  return (
    <div className="page-container">
      <div className="dash">
        <div className="dash-hero">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Skeleton h={12} w={120} />
            <Skeleton h={40} w={300} />
            <Skeleton h={14} w={260} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Skeleton h={96} w={96} style={{ borderRadius: "50%" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Skeleton h={14} w={140} />
              <Skeleton h={11} w={110} />
              <Skeleton h={11} w={180} />
            </div>
          </div>
        </div>

        <SkeletonCard style={{ borderRadius: 0, padding: 30, minHeight: 220 }}>
          <Skeleton h={11} w="30%" style={{ marginBottom: 16 }} />
          <Skeleton h={26} w="55%" style={{ marginBottom: 12 }} />
          <Skeleton h={14} w="45%" style={{ marginBottom: 28 }} />
          <Skeleton h={44} w={200} />
        </SkeletonCard>

        <div className="dash-cols">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Skeleton h={18} w="40%" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{ display: "flex", gap: 16, alignItems: "center", padding: "12px 0" }}
              >
                <Skeleton w={8} h={8} style={{ borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <Skeleton h={14} w="70%" />
                  <Skeleton h={11} w="30%" />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Skeleton h={18} w="40%" />
            <SkeletonCard style={{ borderRadius: 0, height: 220 }} />
            <SkeletonCard style={{ borderRadius: 0, height: 160 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
