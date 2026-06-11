import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state for /revisions. Mirrors the real page's outer container
 * (.page-container), breadcrumb + eyebrow + big h1 + subtitle, and the bordered
 * review list (.review-row-layout rows on a #2A2560/#0A0826 surface) plus the
 * footer strip - so first paint occupies the same boxes (zero layout shift).
 */
export default function RevisionsLoading(): React.ReactElement {
  const ROWS = 6;

  return (
    <div className="page-container">
      {/* Breadcrumb line */}
      <div style={{ marginBottom: 28 }}>
        <Skeleton w={240} h={12} />
      </div>

      {/* Eyebrow (// SESSION · SM-2 · …) */}
      <div style={{ marginBottom: 14 }}>
        <Skeleton w={320} h={11} />
      </div>

      {/* Big h1 (clamp 40-72, line-height 1.1) */}
      <div style={{ margin: "0 0 24px", maxWidth: 920 }}>
        <Skeleton w="70%" h={64} radius={8} />
      </div>

      {/* Subtitle */}
      <div style={{ maxWidth: 620, margin: "0 0 44px" }}>
        <Skeleton w="100%" h={14} style={{ marginBottom: 8 }} />
        <Skeleton w="80%" h={14} />
      </div>

      {/* Review list */}
      <section style={{ marginBottom: 0 }}>
        <div style={{ border: "1px solid #2A2560", background: "#0A0826", overflow: "hidden" }}>
          {Array.from({ length: ROWS }).map((_, i) => (
            <div
              key={i}
              className="review-row-layout"
              style={{
                borderBottom: i < ROWS - 1 ? "1px solid rgba(31,27,71,0.6)" : "none",
              }}
            >
              {/* index chip (64px col) */}
              <Skeleton w={36} h={28} radius={0} />

              {/* body: badge row + title */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Skeleton w={84} h={14} radius={0} />
                  <Skeleton w={72} h={10} />
                </div>
                <Skeleton w="58%" h={15} />
              </div>

              {/* due */}
              <Skeleton w={96} h={11} />

              {/* time */}
              <Skeleton w={42} h={11} />

              {/* go */}
              <Skeleton w={70} h={11} />
            </div>
          ))}

          {/* Footer strip */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 24px",
              borderTop: "1px solid rgba(31,27,71,0.6)",
              background: "#050416",
            }}
          >
            <Skeleton w={320} h={10} />
            <Skeleton w={120} h={10} />
          </div>
        </div>
      </section>

      {/* CTAs */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 32 }}>
        <Skeleton w={220} h={52} radius={0} />
        <Skeleton w={160} h={12} />
      </div>
    </div>
  );
}
