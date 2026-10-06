import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * A lesson while it loads, drawn on the page's own classes (`.lesson-page`,
 * `.lesson-hero-grid`, `.briefing-card`, `.lesson-stepper-grid`,
 * `.section-nav-bar`, `.lesson-rating-qa-grid`) and on the spacings its
 * components set inline: the breadcrumb, the hero and its briefing, the
 * section timeline, the first section beside the rail, the next-lesson bar,
 * then the rating and the questions.
 */

const SECTIONS = [0, 1, 2, 3, 4];

/** A rail block's heading, ruled under like the real one. */
function RailHead({ w, extra }: { w: number; extra?: number }): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 14,
        paddingBottom: 10,
        borderBottom: "1px solid var(--color-border-subtle)",
      }}
    >
      <Skeleton w={w} h={10} />
      {extra !== undefined && <Skeleton w={extra} h={10} />}
    </div>
  );
}

/** One label + value of the briefing card. */
function BriefingRowSkeleton({ value, h }: { value: number; h: number }): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Skeleton w={76} h={10} />
      <Skeleton w={value} h={h} />
    </div>
  );
}

export default function LessonDetailLoading(): React.ReactElement {
  return (
    <div className="lesson-page" aria-busy="true" aria-label="Chargement de la leçon">
      {/* The terminal breadcrumb, a `.card` sized to its line. */}
      <div
        className="card"
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 14px",
          marginBottom: 40,
        }}
      >
        <Skeleton w={8} h={12} />
        <Skeleton w={46} h={12} />
        <Skeleton w={64} h={12} />
        <Skeleton w={190} h={12} style={{ maxWidth: "40vw" }} />
      </div>

      <div className="lesson-hero-grid" aria-hidden="true">
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
            <Skeleton w={96} h={26} />
            <Skeleton w={104} h={26} />
          </div>
          {/* The h1: clamp(28px, 6vw, 80px), two lines. */}
          <Skeleton w="88%" h="clamp(24px, 5.2vw, 68px)" style={{ marginBottom: 8 }} />
          <Skeleton w="56%" h="clamp(24px, 5.2vw, 68px)" style={{ marginBottom: 22 }} />
          <SkeletonText
            lines={3}
            lastWidth="48%"
            lineHeight={15}
            gap={11}
            style={{ maxWidth: 560 }}
          />
        </div>

        <div className="briefing-card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              borderBottom: "1px solid var(--color-border-default)",
            }}
          >
            <Skeleton w={140} h={10} />
            <Skeleton w={92} h={10} />
          </div>
          <div
            style={{
              padding: "24px 24px 20px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "22px 24px",
            }}
          >
            <BriefingRowSkeleton value={72} h={20} />
            <BriefingRowSkeleton value={92} h={20} />
            <BriefingRowSkeleton value={104} h={20} />
            <BriefingRowSkeleton value={92} h={11} />
            <div style={{ gridColumn: "1 / -1" }}>
              <Skeleton w={220} h={10} style={{ marginBottom: 8 }} />
              <Skeleton h={3} />
            </div>
          </div>
        </div>
      </div>

      {/* The section timeline: a label, a diamond and a mark per section. */}
      <div
        aria-hidden="true"
        style={{
          margin: "0 0 64px",
          padding: "28px 8px 24px",
          borderTop: "1px solid var(--color-border-subtle)",
          borderBottom: "1px solid var(--color-border-subtle)",
          overflowX: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", minWidth: "max-content" }}>
          {SECTIONS.map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "0 4px",
              }}
            >
              <Skeleton w={96} h={10} style={{ margin: "9px 0 21px" }} />
              <Skeleton w={14} h={14} style={{ transform: "rotate(45deg)" }} />
              <Skeleton w={i === 0 ? 64 : 12} h={10} style={{ marginTop: 10 }} />
            </div>
          ))}
        </div>
      </div>

      <div className="lesson-stepper-grid" aria-hidden="true">
        <div>
          {/* The first section: its numbered h2, prose, a code block, prose. */}
          <div style={{ paddingBottom: 20 }}>
            <Skeleton w="58%" h="clamp(28px, 2.8vw, 36px)" style={{ marginBottom: 26 }} />
            <SkeletonText
              lines={4}
              lastWidth="66%"
              lineHeight={15}
              gap={13}
              style={{ maxWidth: 680, marginBottom: 24 }}
            />
            <div
              className="card"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "9px 16px",
              }}
            >
              <Skeleton w={110} h={11} />
              <Skeleton w={48} h={9} />
            </div>
            <div className="card card--sunken" style={{ padding: "16px 20px", marginBottom: 24 }}>
              <SkeletonText lines={5} lastWidth="38%" lineHeight={12} gap={10} />
            </div>
            <SkeletonText
              lines={3}
              lastWidth="52%"
              lineHeight={15}
              gap={13}
              style={{ maxWidth: 680 }}
            />
          </div>

          <div className="section-nav-bar">
            <div
              style={{ display: "flex", alignItems: "center", padding: "0 24px", minHeight: 60 }}
            >
              <Skeleton w={104} h={11} />
            </div>
            <div className="section-nav-center">
              <Skeleton w={96} h={9} style={{ margin: "0 auto" }} />
              <Skeleton w={130} h={12} style={{ margin: "6px auto 0" }} />
            </div>
            <Skeleton />
          </div>
        </div>

        <aside className="lesson-stepper-rail">
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div>
              <RailHead w={124} extra={24} />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {SECTIONS.map((i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "24px 1fr auto",
                      alignItems: "center",
                      gap: 12,
                      padding: "13px 12px 13px 14px",
                    }}
                  >
                    <Skeleton w={16} h={10} />
                    <Skeleton w={`${String(82 - i * 7)}%`} h={13} />
                    <Skeleton w={8} h={10} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <RailHead w={74} />
              <div
                className="lesson-author-card"
                style={{
                  display: "grid",
                  gridTemplateColumns: "34px minmax(0, 1fr)",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                }}
              >
                <Skeleton w={34} h={34} />
                <div>
                  <Skeleton w="58%" h={12} style={{ marginBottom: 6 }} />
                  <Skeleton w="84%" h={10} />
                </div>
              </div>
            </div>

            <div style={{ padding: "10px 12px", display: "grid", gap: 8 }}>
              <Skeleton w={70} h={10} />
              <SkeletonText lines={2} lastWidth="62%" lineHeight={11} gap={9} />
              <Skeleton w={116} h={12} />
            </div>
          </div>
        </aside>
      </div>

      {/* The next-lesson bar: the preview, then the two actions. */}
      <div
        className="card"
        aria-hidden="true"
        style={{ marginTop: 88, display: "grid", gridTemplateColumns: "1fr auto" }}
      >
        <div
          style={{
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            minWidth: 0,
            borderRight: "1px solid var(--color-border-default)",
          }}
        >
          <Skeleton w={130} h={10} />
          <Skeleton w={200} h={10} style={{ maxWidth: "100%" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Skeleton w={64} h={17} />
            <Skeleton w={80} h={17} />
            <Skeleton w={92} h={9} />
          </div>
          <Skeleton w="54%" h={18} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "0 24px" }}>
          <Skeleton w={168} h={38} />
          <Skeleton w={150} h={34} />
        </div>
      </div>

      <div className="lesson-rating-qa-grid" aria-hidden="true">
        <div className="card card--sunken" style={{ padding: "28px 32px" }}>
          <Skeleton w={96} h={10} style={{ marginBottom: 9 }} />
          <Skeleton w={190} h={15} style={{ marginBottom: 22 }} />
          {/* Locked until the lesson is finished: the notice that says so. */}
          <Skeleton h={44} />
        </div>

        <div>
          <Skeleton w={170} h={10} style={{ marginBottom: 9 }} />
          <Skeleton w={210} h={17} style={{ marginBottom: 18 }} />
          <Skeleton w={210} h={44} style={{ marginBottom: 24 }} />
          <Skeleton h={150} />
        </div>
      </div>
    </div>
  );
}
