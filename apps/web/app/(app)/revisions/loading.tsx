import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * The revisions while they load, drawn on the page's own classes
 * (`.page-container`, `.card`, `.review-row-layout`) and the spacings it sets
 * inline: the breadcrumb, eyebrow, title and lede, the day's session (the
 * first row open on its grading buttons, a footer strip), the way back, then
 * the upcoming reviews.
 */

const ROWS = [0, 1, 2, 3];
const UPCOMING = ["46%", "38%", "52%"];
const ROW_RULE = "1px solid var(--color-border-subtle)";

/** One review row (.review-row-layout): index, category and title, due, time, toggle. */
function ReviewRowSkeleton({ title }: { title: string }): React.ReactElement {
  return (
    <div className="review-row-layout">
      <Skeleton w={36} h={28} />
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Skeleton w={64} h={18} />
          <Skeleton w={118} h={10} />
        </div>
        <Skeleton w={title} h={14} />
      </div>
      <Skeleton w={96} h={10} />
      <Skeleton w={44} h={10} />
      <Skeleton w={60} h={10} />
    </div>
  );
}

export default function RevisionsLoading(): React.ReactElement {
  return (
    <div className="page-container" aria-busy="true" aria-label="Chargement des révisions">
      <div className="pg-crumb" aria-hidden="true">
        <Skeleton w={205} h={14} />
      </div>

      <div aria-hidden="true">
        <Skeleton w={300} h={10} style={{ maxWidth: "100%", marginBottom: 17 }} />
        {/* The h1: clamp(40px, 5.5vw, 72px), two lines within 920px. */}
        <div style={{ maxWidth: 920, marginBottom: 24 }}>
          <Skeleton w="84%" h="clamp(34px, 4.6vw, 62px)" style={{ marginBottom: 14 }} />
          <Skeleton w="46%" h="clamp(34px, 4.6vw, 62px)" />
        </div>
        <SkeletonText
          lines={2}
          lastWidth="72%"
          lineHeight={14}
          gap={10}
          style={{ maxWidth: 620, marginBottom: 44 }}
        />
      </div>

      <section aria-hidden="true">
        <div className="card" style={{ overflow: "hidden" }}>
          {ROWS.map((i) => (
            <div key={i} style={{ borderBottom: ROW_RULE }}>
              <ReviewRowSkeleton title={`${String(58 - i * 6)}%`} />
              {i === 0 && (
                <div
                  style={{
                    padding: "14px 24px 18px 80px",
                    borderTop: "1px dashed var(--color-border-subtle)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <Skeleton w={330} h={11} style={{ maxWidth: "100%" }} />
                    <Skeleton w={140} h={27} />
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    <Skeleton h={34} style={{ flex: 1 }} />
                    <Skeleton h={34} style={{ flex: 1 }} />
                    <Skeleton h={34} style={{ flex: 1 }} />
                  </div>
                </div>
              )}
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              padding: "14px 24px",
              background: "var(--color-bg-sunken)",
            }}
          >
            <Skeleton w={330} h={10} style={{ maxWidth: "60%" }} />
            <Skeleton w={130} h={10} />
          </div>
        </div>
      </section>

      <div aria-hidden="true" style={{ display: "flex", alignItems: "center", marginTop: 32 }}>
        <Skeleton w={170} h={10} style={{ margin: "18px 8px" }} />
      </div>

      <div aria-hidden="true" style={{ marginTop: 56 }}>
        <Skeleton w={176} h={10} style={{ marginBottom: 16 }} />
        <div className="card card--ghost" style={{ overflow: "hidden" }}>
          {UPCOMING.map((w, i) => (
            <div
              key={w}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                padding: "13px 18px",
                borderBottom: i < UPCOMING.length - 1 ? ROW_RULE : "none",
              }}
            >
              <Skeleton w={w} h={12} />
              <Skeleton w={120} h={9} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
