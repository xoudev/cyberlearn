import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import "./_components/paths-catalog-v2.css";

/** Page tokens (mirrors .pc2-root): square corners + #2a2560 hairline. */
const PC2_BORDER = "#2a2560";
const CARD_STYLE: React.CSSProperties = {
  borderRadius: 0,
  borderColor: PC2_BORDER,
  background: "rgba(10, 8, 38, 0.6)",
};

/** A square-cornered, page-toned card surface used by every pc2 card. */
function Pc2Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}): React.ReactElement {
  return (
    <div style={{ border: `1px solid ${PC2_BORDER}`, ...CARD_STYLE, ...style }}>{children}</div>
  );
}

/** Mirrors <SectionLabel>: a short tag + count + flexing rule. */
function SectionLabelSkeleton(): React.ReactElement {
  return (
    <div className="pc2-section">
      <Skeleton w={120} h={12} />
      <Skeleton w={150} h={11} />
      <span className="pc2-section__rule" />
    </div>
  );
}

/** Mirrors one .active-card in the secondary row (glyph rail + body). */
function SecondaryCardSkeleton(): React.ReactElement {
  return (
    <Pc2Card style={{ display: "grid", gridTemplateColumns: "132px minmax(0, 1fr)" }}>
      <div
        style={{ display: "grid", placeItems: "center", borderRight: `1px solid ${PC2_BORDER}` }}
      >
        <Skeleton w={56} h={56} radius={0} />
      </div>
      <div style={{ padding: "20px 22px 18px", minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <Skeleton w={78} h={20} radius={0} />
          <Skeleton w={60} h={12} style={{ marginLeft: "auto" }} />
        </div>
        <Skeleton h={22} w="78%" style={{ marginBottom: 12 }} />
        <Skeleton h={11} w="62%" style={{ marginBottom: 16 }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
          <Skeleton w="40%" h={10} />
          <Skeleton w={32} h={10} />
        </div>
        <Skeleton h={7} radius={0} />
        <Skeleton w={110} h={11} style={{ marginTop: 16 }} />
      </div>
    </Pc2Card>
  );
}

export default function PathsLoading(): React.ReactElement {
  return (
    <div className="pc2-root">
      <div className="pc2">
        {/* breadcrumb */}
        <div className="pc2-crumb">
          <Skeleton w={210} h={12} />
        </div>

        {/* header: title + sub (left) / telemetry (right) */}
        <header className="pc2-head">
          <div>
            <Skeleton h={62} w="72%" style={{ marginBottom: 16 }} />
            <div style={{ maxWidth: 520, display: "flex", flexDirection: "column", gap: 8 }}>
              <Skeleton h={14} w="100%" />
              <Skeleton h={14} w="84%" />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              alignItems: "flex-end",
              paddingBottom: 6,
            }}
          >
            <Skeleton w={280} h={11} />
            <div className="pc2-telemetry__rule" />
            <Skeleton w={220} h={11} />
          </div>
        </header>

        {/* filters: label + pills + search (pushed right) */}
        <div className="pc2-filters">
          <Skeleton w={64} h={10} />
          <div className="pc2-filters__group">
            {(["all", "cyber", "dev", "net"] as const).map((id) => (
              <Skeleton key={id} w={id === "all" ? 78 : 104} h={34} radius={0} />
            ))}
          </div>
          <span className="pc2-filters__sep" />
          <Skeleton w={230} h={34} radius={0} style={{ marginLeft: "auto" }} />
        </div>

        {/* "Reprendre" — hero active path */}
        <SectionLabelSkeleton />
        <Pc2Card
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.55fr) minmax(0, 1fr)",
          }}
        >
          {/* hero main */}
          <div style={{ padding: "34px 38px 30px", minWidth: 0 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 26, flexWrap: "wrap" }}>
              <Skeleton w={92} h={24} radius={0} />
              <Skeleton w={84} h={24} radius={0} />
              <Skeleton w={108} h={24} radius={0} />
              <Skeleton w={96} h={14} style={{ marginLeft: "auto" }} />
            </div>
            <Skeleton h={44} w="68%" style={{ marginBottom: 16 }} />
            <div
              style={{
                maxWidth: 540,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 24,
              }}
            >
              <Skeleton h={13} w="100%" />
              <Skeleton h={13} w="88%" />
            </div>
            <div
              style={{
                display: "flex",
                gap: 14,
                padding: "16px 0",
                borderTop: `1px solid ${PC2_BORDER}`,
              }}
            >
              <Skeleton w={96} h={12} />
              <Skeleton w={64} h={12} />
              <Skeleton w={88} h={12} />
            </div>
            <div style={{ marginTop: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9 }}>
                <Skeleton w={220} h={11} />
                <Skeleton w={48} h={20} />
              </div>
              <Skeleton h={12} radius={0} />
              <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
                <Skeleton w={220} h={50} radius={0} />
                <Skeleton w={120} h={50} radius={0} />
              </div>
            </div>
          </div>
          {/* hero console */}
          <div
            style={{
              borderLeft: `1px solid ${PC2_BORDER}`,
              background: "#05041a",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{ flex: 1, display: "grid", placeItems: "center", padding: "38px 24px 10px" }}
            >
              <Skeleton w={132} h={132} radius="circle" />
            </div>
            <Pc2Card
              style={{
                margin: "0 18px 18px",
                padding: "16px 18px",
                background: "rgba(3, 2, 25, 0.78)",
              }}
            >
              <Skeleton w={180} h={10} style={{ marginBottom: 9 }} />
              <Skeleton h={16} w="80%" style={{ marginBottom: 10 }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Skeleton w={120} h={11} />
                <Skeleton w={64} h={11} />
              </div>
            </Pc2Card>
          </div>
        </Pc2Card>

        {/* "Progression" — secondary row: 3 equal cards */}
        <SectionLabelSkeleton />
        <div className="pc2-duo">
          {Array.from({ length: 3 }).map((_, i) => (
            <SecondaryCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
