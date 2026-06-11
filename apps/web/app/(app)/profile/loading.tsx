import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const HAIRLINE = "#1F1B47";
const PANEL_BG = "rgba(5,4,26,0.5)";

export default function ProfileLoading(): React.ReactElement {
  return (
    <div className="page-container">
      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      <div
        style={{
          marginBottom: 28,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Skeleton w={180} h={12} />
      </div>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section
        className="catalog-header-grid"
        style={{
          marginBottom: 56,
          paddingBottom: 40,
          borderBottom: `1px solid ${HAIRLINE}`,
          alignItems: "start",
        }}
      >
        {/* Left: avatar + identity */}
        <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
          {/* Hex avatar */}
          <Skeleton
            w={156}
            h={180}
            style={{
              flexShrink: 0,
              clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
            }}
          />

          <div style={{ paddingTop: 6, minWidth: 0, flex: 1 }}>
            {/* Username heading */}
            <Skeleton w={320} h={56} style={{ marginBottom: 14, maxWidth: "100%" }} />
            {/* Display name */}
            <Skeleton w={180} h={13} style={{ marginBottom: 24 }} />
            {/* Bio */}
            <div style={{ maxWidth: 540, marginBottom: 18 }}>
              <Skeleton h={14} w="100%" style={{ marginBottom: 8 }} />
              <Skeleton h={14} w="78%" />
            </div>
            {/* Member-since chip */}
            <Skeleton w={220} h={11} />
          </div>
        </div>

        {/* Right: summary card + edit button */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Corner-bracket summary card */}
          <div
            style={{
              position: "relative",
              padding: "24px 28px",
              background: "rgba(5,4,26,0.6)",
              border: `1px solid ${HAIRLINE}`,
            }}
          >
            {/* Eyebrow */}
            <Skeleton w="55%" h={10} style={{ marginBottom: 14 }} />
            {/* Big XP number */}
            <Skeleton w={240} h={56} style={{ marginBottom: 14, maxWidth: "100%" }} />
            {/* Meta row */}
            <div
              style={{
                paddingTop: 14,
                borderTop: `1px dashed ${HAIRLINE}`,
              }}
            >
              <Skeleton w="70%" h={11} />
            </div>
          </div>

          {/* Edit profile button */}
          <Skeleton
            h={39}
            w="100%"
            radius={0}
            style={{ border: "1px solid #2A2560", background: "transparent" }}
          />
        </div>
      </section>

      {/* ── XP bar ─────────────────────────────────────────────────────────── */}
      <div
        className="profile-xp-bar"
        style={{
          position: "relative",
          marginBottom: 56,
          background: PANEL_BG,
          border: `1px solid ${HAIRLINE}`,
        }}
      >
        {/* Level number + label */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <Skeleton w={92} h={84} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton w={88} h={10} />
            <Skeleton w={56} h={16} />
          </div>
        </div>

        {/* Track */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <Skeleton w={150} h={18} />
            <Skeleton w={70} h={11} />
            <Skeleton w={40} h={11} />
          </div>
          {/* Segmented bar */}
          <Skeleton h={10} w="100%" radius={0} style={{ border: `1px solid ${HAIRLINE}` }} />
        </div>

        {/* Remaining XP */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <Skeleton w={120} h={26} />
          <Skeleton w={170} h={11} />
        </div>
      </div>

      {/* ── Stats row (5 cells) ─────────────────────────────────────────────── */}
      <div
        className="profile-stats-grid"
        style={{
          border: `1px solid ${HAIRLINE}`,
          background: PANEL_BG,
          marginBottom: 64,
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`stat-${String(i)}`} className="profile-stats-cell">
            <Skeleton w="60%" h={10} style={{ marginBottom: 14 }} />
            <Skeleton w={64} h={48} style={{ marginBottom: 12 }} />
            <Skeleton w="50%" h={10} />
          </div>
        ))}
      </div>

      {/* ── Tabs + content ──────────────────────────────────────────────────── */}
      <div>
        {/* Tabs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderBottom: `1px solid ${HAIRLINE}`,
            marginBottom: 36,
            paddingBottom: 14,
          }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={`tab-${String(i)}`} w={120} h={14} />
          ))}
          <Skeleton w={200} h={11} style={{ marginLeft: "auto" }} />
        </div>

        {/* Badge grid (default active tab) - 4 columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`badge-${String(i)}`}
              style={{
                position: "relative",
                padding: "24px 18px 22px",
                background: "rgba(10,8,38,0.5)",
                border: `1px solid ${HAIRLINE}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              {/* Hex medallion */}
              <Skeleton
                w={88}
                h={100}
                style={{
                  marginBottom: 18,
                  clipPath: "polygon(50% 0, 100% 28%, 100% 72%, 50% 100%, 0 72%, 0 28%)",
                }}
              />
              {/* Rarity label */}
              <Skeleton w={80} h={9} style={{ marginBottom: 8 }} />
              {/* Name */}
              <Skeleton w="70%" h={16} style={{ marginBottom: 8 }} />
              {/* Earned date */}
              <Skeleton w="55%" h={10} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
