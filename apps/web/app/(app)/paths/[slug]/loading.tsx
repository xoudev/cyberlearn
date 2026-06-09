import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

// Surface that mirrors a .pd2 panel (brief / ablock / mission card): dark fill +
// 1px #2a2560 hairline, sharp corners (the design uses border-radius: 0).
const PANEL: React.CSSProperties = {
  background: "rgba(5, 4, 26, 0.6)",
  border: "1px solid #2a2560",
  borderRadius: 0,
};

/**
 * Loading state for /paths/[slug] (the serpentine quest-log path).
 * Reuses the real .pd2 layout/grid classes so the first paint occupies the same
 * boxes as the loaded page (breadcrumb → hero → progress → body grid). The
 * serpentine itself is rendered as a faithful-but-simpler set of alternating
 * mission-card placeholders plus a final-boss card, matching node/card sizes.
 */
export default function PathDetailLoading(): React.ReactElement {
  const NODE_COUNT = 4;

  return (
    <div className="pd2">
      {/* breadcrumb (mono, 12px, ~13px tall) */}
      <div className="pd2-crumb">
        <Skeleton w={220} h={12} />
      </div>

      {/* hero: 1.5fr title block + 1fr brief panel */}
      <section className="pd2-hero">
        <div>
          <div className="pd2-hero__tags">
            <Skeleton w={96} h={26} radius={0} />
            <Skeleton w={120} h={26} radius={0} />
          </div>
          {/* title clamp(46–82px); two lines of a large heading */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "0 0 20px" }}>
            <Skeleton w="80%" h={58} />
            <Skeleton w="55%" h={58} />
          </div>
          <SkeletonText
            lines={3}
            lastWidth="45%"
            lineHeight={14}
            gap={9}
            style={{ maxWidth: 600 }}
          />
        </div>

        {/* mission brief panel */}
        <div style={{ ...PANEL, padding: "22px 24px 24px" }}>
          <Skeleton w={140} h={10} style={{ marginBottom: 18 }} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 1,
              background: "#2a2560",
              margin: "0 -24px",
              borderTop: "1px solid #2a2560",
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ background: "#06041d", padding: "15px 20px" }}>
                <Skeleton w={64} h={9} style={{ marginBottom: 8 }} />
                <Skeleton w={84} h={26} />
              </div>
            ))}
          </div>
          <Skeleton h={50} radius={0} style={{ marginTop: 18 }} />
        </div>
      </section>

      {/* path-wide progress bar */}
      <div className="pd2-prog">
        <Skeleton w={110} h={14} />
        <div className="pd2-prog__bar" style={{ border: "1px solid #2a2560" }} />
        <Skeleton w={120} h={12} />
      </div>

      {/* body: serpentine path (1fr) + aside (320px) */}
      <div className="pd2-body">
        <div className="cpath">
          {/* module gate */}
          <div className="cp-gate">
            <div className="cp-gate__side cp-gate__side--l">
              <span className="cp-gate__rule" />
              <Skeleton w={84} h={11} />
            </div>
            <div className="cp-mid">
              <span className="cp-gate__marker" />
            </div>
            <div className="cp-gate__side">
              <Skeleton w={70} h={10} />
              <span className="cp-gate__rule" />
            </div>
          </div>

          {/* alternating mission-card placeholders */}
          {Array.from({ length: NODE_COUNT }).map((_, i) => {
            const side = i % 2 === 0 ? "is-left" : "is-right";
            return (
              <div key={i} className={`cp-row ${side}${i === 0 ? " cp-row--first" : ""}`}>
                {side === "is-left" ? (
                  <div className="cp-cell cp-cell--card">
                    <div className="cp-card" style={PANEL}>
                      <Skeleton w={120} h={10} style={{ marginBottom: 12 }} />
                      <Skeleton w="85%" h={18} style={{ marginBottom: 12 }} />
                      <Skeleton w={160} h={11} />
                    </div>
                  </div>
                ) : (
                  <div className="cp-cell cp-cell--empty" />
                )}
                <div className="cp-mid">
                  <Skeleton w={58} h={66} radius={8} />
                </div>
                {side === "is-right" ? (
                  <div className="cp-cell cp-cell--card">
                    <div className="cp-card" style={PANEL}>
                      <Skeleton w={120} h={10} style={{ marginBottom: 12 }} />
                      <Skeleton w="85%" h={18} style={{ marginBottom: 12 }} />
                      <Skeleton w={160} h={11} />
                    </div>
                  </div>
                ) : (
                  <div className="cp-cell cp-cell--empty" />
                )}
              </div>
            );
          })}

          {/* final boss certificate card */}
          <div
            style={{
              ...PANEL,
              marginTop: 4,
              padding: "38px 32px 34px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 18,
            }}
          >
            <Skeleton w={140} h={10} />
            <Skeleton w={116} h={132} radius={8} />
            <Skeleton w={240} h={28} />
            <Skeleton w={420} h={14} />
            <Skeleton w={240} h={48} radius={0} />
          </div>
        </div>

        {/* aside: objectives + badges blocks */}
        <aside className="pd2-aside">
          <div style={{ ...PANEL, padding: "22px 22px 24px" }}>
            <Skeleton w={120} h={10} style={{ marginBottom: 16 }} />
            <Skeleton w={180} h={16} style={{ marginBottom: 16 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} w={i % 2 === 0 ? "100%" : "80%"} h={13} />
              ))}
            </div>
          </div>

          <div style={{ ...PANEL, padding: "22px 22px 24px" }}>
            <Skeleton w={120} h={10} style={{ marginBottom: 16 }} />
            <Skeleton w={180} h={16} style={{ marginBottom: 16 }} />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "14px 10px",
                justifyItems: "center",
                marginBottom: 18,
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} w={64} h={72} radius={8} />
              ))}
            </div>
            <Skeleton h={40} radius={0} />
          </div>
        </aside>
      </div>
    </div>
  );
}
