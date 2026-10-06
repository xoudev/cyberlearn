import React from "react";
import { Skeleton, SkeletonCard, SkeletonText } from "@/components/ui/skeleton";

/**
 * The badges collection while it loads, drawn on the page's own classes and
 * layout (badges-collection.tsx, badge-card.tsx): the breadcrumb, the
 * `catalog-header-grid` header with its tally and progress, the rarity pills
 * and the search box, then rarity sections of `grid-3-col` cards. The badge
 * card has no class of its own, so it stands on `SkeletonCard` with the
 * card's own padding. Shared by `loading.tsx` and the page's `<Suspense>`.
 */

const PILL_LABELS = [44, 92, 56, 40, 60];
const TALLY = [92, 72, 56, 76];

function BadgeCardSkeleton({
  legendary,
  progress,
}: {
  legendary: boolean;
  progress: boolean;
}): React.ReactElement {
  return (
    <SkeletonCard
      style={{
        position: "relative",
        padding: legendary ? "32px 24px 26px" : "26px 20px 22px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Skeleton w={64} h={9} style={{ position: "absolute", top: 12, left: 12 }} />
      <Skeleton
        w={legendary ? 123 : 95}
        h={legendary ? 142 : 110}
        style={{ margin: legendary ? "10px 0 22px" : "8px 0 18px" }}
      />
      <Skeleton w={96} h={9} style={{ marginBottom: 12 }} />
      <Skeleton w="58%" h={legendary ? 22 : 17} style={{ marginBottom: 12 }} />
      <SkeletonText
        lines={2}
        lastWidth="64%"
        lineHeight={12}
        gap={7}
        style={{
          width: "100%",
          maxWidth: legendary ? 320 : 260,
          alignItems: "center",
          marginBottom: 20,
        }}
      />
      <div
        style={{
          marginTop: "auto",
          width: "100%",
          paddingTop: 14,
          borderTop: "1px solid var(--color-border-subtle)",
          display: "flex",
          flexDirection: "column",
          alignItems: progress ? "stretch" : "center",
          gap: 9,
        }}
      >
        {progress ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Skeleton w={120} h={10} />
              <Skeleton w={30} h={10} />
            </div>
            <Skeleton h={3} />
          </>
        ) : (
          <Skeleton w={150} h={10} />
        )}
      </div>
    </SkeletonCard>
  );
}

function SectionSkeleton({ legendary }: { legendary: boolean }): React.ReactElement {
  return (
    <section style={{ marginTop: 56 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
        <Skeleton h={1} style={{ flex: "0 0 60px" }} />
        <Skeleton w={150} h={12} />
        <Skeleton w={100} h={11} />
        <Skeleton h={1} style={{ flex: 1 }} />
      </div>
      <div className="grid-3-col">
        <BadgeCardSkeleton legendary={legendary} progress={false} />
        <BadgeCardSkeleton legendary={legendary} progress={false} />
        <BadgeCardSkeleton legendary={legendary} progress />
      </div>
    </section>
  );
}

export function BadgesSkeleton(): React.ReactElement {
  return (
    <div className="page-container" aria-busy="true" aria-label="Chargement des badges">
      <div className="pg-crumb" aria-hidden="true">
        <Skeleton w={170} h={12} />
      </div>

      <div className="catalog-header-grid" aria-hidden="true">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <Skeleton w={380} h="clamp(42px, 5.1vw, 72px)" style={{ maxWidth: "70%" }} />
            <Skeleton w={100} h="clamp(18px, 2.2vw, 30px)" />
          </div>
          <SkeletonText
            lines={2}
            lastWidth="58%"
            lineHeight={14}
            gap={9}
            style={{ maxWidth: 520 }}
          />
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}
        >
          <div style={{ display: "flex", gap: 30, flexWrap: "wrap", padding: "3px 0" }}>
            {TALLY.map((w) => (
              <Skeleton key={w} w={w} h={10} />
            ))}
          </div>
          <Skeleton w={320} h={8} style={{ maxWidth: "100%" }} />
          <Skeleton w={130} h={10} style={{ margin: "3px 0" }} />
        </div>
      </div>

      <div
        aria-hidden="true"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}
      >
        <Skeleton w={62} h={10} style={{ marginRight: 6 }} />
        <div className="pills">
          {PILL_LABELS.map((w) => (
            <div key={w} className="pill">
              <Skeleton w={w} h={10} />
              <Skeleton w={20} h={14} />
            </div>
          ))}
        </div>
        <Skeleton w={220} h={34} style={{ marginLeft: "auto" }} />
      </div>

      <div aria-hidden="true">
        <SectionSkeleton legendary />
        <SectionSkeleton legendary={false} />
      </div>
    </div>
  );
}
