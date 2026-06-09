import React from "react";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

/**
 * Loading placeholder for the badges collection. Shared by `loading.tsx` and
 * the in-page `<Suspense>` fallback (single source of truth). Mirrors the real
 * header + two rarity groups of hexagonal badge cards to avoid layout shift.
 */
export function BadgesSkeleton(): React.ReactElement {
  return (
    <div className="page-container">
      <div style={{ marginBottom: 40 }}>
        <Skeleton h={36} w={160} style={{ marginBottom: 12 }} />
        <Skeleton h={14} w={220} />
      </div>
      {Array.from({ length: 2 }).map((_, gi) => (
        <div key={gi} style={{ marginBottom: 48 }}>
          <Skeleton h={20} w={100} style={{ marginBottom: 20 }} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard
                key={i}
                style={{
                  padding: "32px 24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <Skeleton
                  w={96}
                  h={112}
                  style={{
                    borderRadius: 0,
                    clipPath: "polygon(50% 0, 100% 28%, 100% 72%, 50% 100%, 0 72%, 0 28%)",
                  }}
                />
                <Skeleton h={14} w="70%" />
                <Skeleton h={12} w="50%" />
                <Skeleton h={22} w={80} radius="pill" />
              </SkeletonCard>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
