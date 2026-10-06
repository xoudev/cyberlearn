import React from "react";
import { Skeleton, SkeletonCard, SkeletonText } from "@/components/ui/skeleton";
import "./_components/locker.css";

/**
 * The locker while it loads, drawn on the page's own layout and classes
 * (locker-client.tsx): the same centred column, the eyebrow, title and lede,
 * then `casier-layout` with the slot `tabs` over the grid of cosmetic cards,
 * and the `casier-preview card` beside it (avatar, `stat-tile--sm` figures,
 * terminal, equipped slots). The cosmetic card has no class of its own, so
 * it stands on `SkeletonCard` with the card's own padding and rows.
 */

/** Thèmes, Hexagones, Cadres, Accents: each label's width in 11px mono. */
const TAB_WIDTHS = [57, 86, 57, 67];
const RULE = "1px solid var(--color-border-subtle)";

function CosmeticCardSkeleton({ unlocked }: { unlocked: boolean }): React.ReactElement {
  return (
    <SkeletonCard style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        className="card card--sunken"
        style={{ height: 56, display: "grid", placeItems: "center" }}
      >
        <Skeleton w="78%" h={38} />
      </div>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
      >
        <Skeleton w="55%" h={14} style={{ margin: "2px 0" }} />
        <Skeleton w={48} h={9} />
      </div>
      {unlocked ? (
        <Skeleton h={34} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Skeleton w={128} h={9} style={{ margin: "2px 0" }} />
          <Skeleton w="70%" h={11} style={{ margin: "3px 0" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Skeleton h={6} style={{ flex: 1 }} />
            <Skeleton w={24} h={10} />
          </div>
        </div>
      )}
    </SkeletonCard>
  );
}

function PreviewSkeleton(): React.ReactElement {
  return (
    <div className="casier-preview card" style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 19 }}>
        <Skeleton w={130} h={10} />
        <Skeleton w={40} h={10} />
      </div>
      <div style={{ display: "grid", placeItems: "center", gap: 12, marginBottom: 18 }}>
        <Skeleton w={84} h={94} />
        <Skeleton w={140} h={18} style={{ margin: "2px 0" }} />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="stat-tile stat-tile--sm stat-tile--center" style={{ flex: 1 }}>
            <Skeleton w={26} h={18} style={{ margin: "2px 0" }} />
            <Skeleton w={44} h={9} style={{ margin: "2px 0" }} />
          </div>
        ))}
      </div>
      <div style={{ border: RULE, padding: "13px 12px", marginBottom: 18 }}>
        <SkeletonText lines={3} lastWidth="72%" lineHeight={11} gap={7} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {[64, 82, 56, 74].map((value) => (
          <div
            key={value}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
              borderTop: RULE,
            }}
          >
            <Skeleton w={64} h={11} />
            <Skeleton w={value} h={11} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LockerLoading(): React.ReactElement {
  return (
    <div
      aria-busy="true"
      aria-label="Chargement du casier"
      style={{ maxWidth: 1180, margin: "0 auto", padding: "40px clamp(16px,4vw,48px)" }}
    >
      <div aria-hidden="true">
        <Skeleton w={250} h={10} style={{ margin: "3px 0 13px" }} />
        <Skeleton
          w={460}
          h="clamp(32px, 4.75vw, 50px)"
          style={{ maxWidth: "100%", margin: "8px 0 18px" }}
        />
        <SkeletonText
          lines={2}
          lastWidth="45%"
          lineHeight={13}
          gap={8}
          style={{ maxWidth: 560, margin: "3px 0 31px" }}
        />
        <div className="casier-layout">
          <div>
            <div className="tabs">
              {TAB_WIDTHS.map((w, i) => (
                <div key={i} className="tabs__tab">
                  <Skeleton w={w} h={11} />
                  <Skeleton w={28} h={15} />
                </div>
              ))}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 14,
              }}
            >
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <CosmeticCardSkeleton key={i} unlocked={i < 3} />
              ))}
            </div>
          </div>
          <PreviewSkeleton />
        </div>
      </div>
    </div>
  );
}
