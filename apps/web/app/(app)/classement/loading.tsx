import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Grid template shared by the leaderboard header + rows (mirrors the real table).
const ROW_COLS = "80px minmax(0,1fr) 160px 130px 120px";

// Bracket-corner border used by the real podium / banner surfaces.
const SURFACE_BORDER = "1px solid #2A2560";
const SURFACE_BG = "rgba(5,4,26,0.6)";

function PodiumSkeleton({ tall }: { tall: boolean }): React.ReactElement {
  return (
    <div
      style={{
        position: "relative",
        background: SURFACE_BG,
        border: SURFACE_BORDER,
        padding: "28px 22px 26px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: tall ? 440 : 380,
        transform: tall ? undefined : "translateY(20px)",
      }}
    >
      {/* rank plate */}
      <Skeleton w={120} h={26} style={{ position: "absolute", top: -13 }} />
      {/* hex avatar */}
      <Skeleton
        w={tall ? 100 : 80}
        h={tall ? 115 : 92}
        radius={12}
        style={{ margin: "14px 0 18px" }}
      />
      {/* handle */}
      <Skeleton w={tall ? 200 : 160} h={tall ? 26 : 22} style={{ marginBottom: 12 }} />
      {/* sub-handle */}
      <Skeleton w={120} h={11} style={{ marginBottom: 18 }} />
      {/* XP value */}
      <Skeleton w={tall ? 180 : 140} h={tall ? 48 : 36} style={{ marginBottom: 16 }} />
      {/* level badge */}
      <Skeleton w={150} h={28} style={{ marginBottom: 14 }} />
      {/* streak */}
      <Skeleton w={110} h={13} />
    </div>
  );
}

function TableRowSkeleton(): React.ReactElement {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: ROW_COLS,
        alignItems: "center",
        gap: 16,
        padding: "14px 24px",
        borderBottom: "1px solid rgba(31,27,71,0.5)",
      }}
    >
      {/* rank */}
      <Skeleton w={44} h={22} />
      {/* player */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <Skeleton w={28} h={32} radius={8} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <Skeleton w={150} h={14} />
          <Skeleton w={100} h={11} />
        </div>
      </div>
      {/* XP */}
      <Skeleton w={90} h={18} style={{ justifySelf: "end" }} />
      {/* level */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <Skeleton w={20} h={18} />
        <Skeleton w={64} h={18} />
      </div>
      {/* streak */}
      <Skeleton w={56} h={18} style={{ justifySelf: "end" }} />
    </div>
  );
}

export default function ClassementLoading(): React.ReactElement {
  const podium = [
    { id: "silver", tall: false },
    { id: "gold", tall: true },
    { id: "bronze", tall: false },
  ];
  const rowCount = 8;

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <Skeleton w={260} h={13} style={{ marginBottom: 28 }} />

      {/* Head: eyebrow + title, with filter pills on the right */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 24,
          marginBottom: 12,
        }}
      >
        <div>
          <Skeleton w={320} h={12} style={{ marginBottom: 14 }} />
          <Skeleton w={560} h={60} style={{ maxWidth: "100%" }} />
        </div>
        {/* Filter pills */}
        <div
          style={{
            display: "inline-flex",
            gap: 3,
            border: SURFACE_BORDER,
            background: "rgba(5,4,26,0.5)",
            padding: 3,
          }}
        >
          {["global", "mois", "sem"].map((id) => (
            <Skeleton key={id} w={120} h={38} />
          ))}
        </div>
      </div>

      {/* Meta strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          margin: "18px 0 48px",
          paddingBottom: 18,
          borderBottom: "1px dashed #2A2560",
        }}
      >
        {[140, 90, 70, 110].map((w, i) => (
          <Skeleton key={String(i)} w={w} h={11} />
        ))}
      </div>

      {/* Podium */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.15fr 1fr",
          gap: 24,
          alignItems: "end",
          marginBottom: 96,
        }}
      >
        {podium.map((p) => (
          <PodiumSkeleton key={p.id} tall={p.tall} />
        ))}
      </section>

      {/* Your position banner */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "auto auto 1fr auto auto",
          alignItems: "center",
          gap: 32,
          padding: "24px 32px 24px 36px",
          marginBottom: 56,
          background: SURFACE_BG,
          border: SURFACE_BORDER,
          borderLeft: "3px solid #0AFFD4",
        }}
      >
        <Skeleton w={110} h={28} />
        <Skeleton w={90} h={64} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          <Skeleton w={200} h={24} />
          <Skeleton w={160} h={11} />
        </div>
        <span style={{ width: 1, alignSelf: "stretch", background: "#2A2560" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <Skeleton w={70} h={10} />
          <Skeleton w={100} h={28} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <Skeleton w={90} h={10} />
          <Skeleton w={60} h={28} />
        </div>
      </section>

      {/* Table */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Skeleton w={220} h={12} />
          <Skeleton w={120} h={11} />
        </div>

        <div
          style={{
            position: "relative",
            border: SURFACE_BORDER,
            background: "rgba(5,4,26,0.5)",
            overflow: "hidden",
          }}
        >
          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: ROW_COLS,
              alignItems: "center",
              gap: 16,
              padding: "12px 24px",
              borderBottom: SURFACE_BORDER,
              background: "rgba(0,0,0,0.25)",
            }}
          >
            <Skeleton w={16} h={10} />
            <Skeleton w={60} h={10} />
            <Skeleton w={60} h={10} style={{ justifySelf: "end" }} />
            <Skeleton w={50} h={10} />
            <Skeleton w={50} h={10} style={{ justifySelf: "end" }} />
          </div>

          {/* Rows */}
          {Array.from({ length: rowCount }).map((_, i) => (
            <TableRowSkeleton key={String(i)} />
          ))}
        </div>
      </div>
    </div>
  );
}
