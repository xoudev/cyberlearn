import React from "react";
import { Skeleton, SkeletonCard, SkeletonText } from "@/components/ui/skeleton";

// Card surface override: real .cc card is #08061f, #1f1b47 hairline, square corners.
const CARD_STYLE: React.CSSProperties = {
  background: "#08061f",
  borderColor: "#1f1b47",
  borderRadius: 0,
  padding: 0,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

// Typical first-paint grid count (2-col grid → 6 rows of cards).
const CARD_COUNT = 6;

function ChallengeCardSkeleton(): React.ReactElement {
  return (
    <SkeletonCard style={CARD_STYLE}>
      {/* Cover (.cc__cover height 130) */}
      <div
        style={{
          position: "relative",
          height: 130,
          background: "#0a0826",
          borderBottom: "1px solid #1f1b47",
          display: "grid",
          placeItems: "center",
        }}
      >
        {/* top-left category tag */}
        <Skeleton w={84} h={20} style={{ position: "absolute", top: 8, left: 10 }} />
        {/* top-right diff + type tags */}
        <div style={{ position: "absolute", top: 8, right: 10, display: "flex", gap: 6 }}>
          <Skeleton w={64} h={20} />
          <Skeleton w={48} h={20} />
        </div>
        {/* center icon */}
        <Skeleton w={48} h={48} radius="circle" />
      </div>

      {/* Body (.cc__body padding 18 18 14, gap 8, flex:1) */}
      <div
        style={{
          padding: "18px 18px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          flex: 1,
        }}
      >
        <Skeleton w={72} h={11} />
        <Skeleton w="80%" h={19} />
        <SkeletonText lines={2} lastWidth="55%" lineHeight={13} gap={6} />
      </div>

      {/* Meta row (.cc__meta padding 10 18) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "10px 18px",
          borderTop: "1px solid rgba(31,27,71,0.4)",
          background: "rgba(5,4,26,0.4)",
        }}
      >
        <Skeleton w={56} h={11} />
        <Skeleton w={48} h={11} />
        <Skeleton w={92} h={11} style={{ marginLeft: "auto" }} />
      </div>

      {/* CTA button (.cc__btn full-width, padding 14 20) */}
      <Skeleton w="100%" h={46} radius={0} />
    </SkeletonCard>
  );
}

export default function ChallengesLoading(): React.ReactElement {
  return (
    <div className="chx">
      {/* ── Breadcrumb ── */}
      <div className="chx-breadcrumb">
        <Skeleton w={160} h={12} />
      </div>

      {/* ── Header ── */}
      <div className="chx-head">
        <div>
          <Skeleton w="72%" h={64} style={{ marginBottom: 16 }} />
          <SkeletonText
            lines={2}
            lastWidth="70%"
            lineHeight={15}
            gap={8}
            style={{ maxWidth: 540 }}
          />
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "flex-end" }}>
          <Skeleton w={96} h={12} />
          <Skeleton w={110} h={12} />
          <Skeleton w={112} h={12} />
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="chx-filters">
        <div className="chx-filters__row">
          <Skeleton w={40} h={10} />
          {[80, 96, 64, 78].map((w) => (
            <Skeleton key={`cat-${String(w)}`} w={w} h={34} />
          ))}
          <span className="chx-filters__split" />
          <Skeleton w={42} h={10} />
          {[60, 72, 72, 56].map((w, i) => (
            <Skeleton key={`type-${String(w)}-${String(i)}`} w={w} h={34} />
          ))}
        </div>
        <Skeleton w={200} h={38} />
        <Skeleton w={180} h={38} />
      </div>

      {/* ── Featured panel (.feat 2-col, min-height 320) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.05fr) minmax(0,1fr)",
          marginBottom: 32,
          background: "rgba(10,8,38,0.7)",
          border: "1px solid #1f1b47",
          overflow: "hidden",
          minHeight: 320,
        }}
      >
        {/* Cover */}
        <div
          style={{
            position: "relative",
            background: "#05041a",
            borderRight: "1px solid #1f1b47",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Skeleton w={140} h={140} radius="circle" />
        </div>
        {/* Body (.feat__body padding 28 32, gap 14) */}
        <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 14 }}>
          <Skeleton w={150} h={12} />
          <Skeleton w={200} h={11} />
          <Skeleton w="85%" h={34} />
          <SkeletonText lines={2} lastWidth="60%" lineHeight={14} gap={8} />
          <div style={{ display: "flex", gap: 8 }}>
            <Skeleton w={80} h={22} />
            <Skeleton w={96} h={22} />
            <Skeleton w={56} h={22} />
          </div>
          <Skeleton w={220} h={24} />
          <Skeleton w="100%" h={46} radius={0} style={{ marginTop: 4 }} />
        </div>
      </div>

      {/* ── Section heading ── */}
      <div className="chx-section-head">
        <div>
          <Skeleton w={170} h={11} style={{ marginBottom: 8 }} />
          <Skeleton w={200} h={26} />
        </div>
        <Skeleton w={220} h={11} />
      </div>

      {/* ── Grid ── */}
      <div className="chx-grid">
        {Array.from({ length: CARD_COUNT }).map((_, i) => (
          <ChallengeCardSkeleton key={`card-${String(i)}`} />
        ))}
      </div>
    </div>
  );
}
