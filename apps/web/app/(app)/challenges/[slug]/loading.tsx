import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * A challenge's page while it loads, drawn on the page's own container (.chx)
 * and its own grids (.chx-hero, .chx-body): the breadcrumb, the hero (title and
 * tags beside the briefing card), the content grid 1.85fr / 1fr (instructions,
 * the Linux machine and the flag form on the left; hints and statistics in the
 * rail) and the previous / next nav at the bottom, at their real sizes.
 */

/** The hero's angular tags, cut like the page's own (AngularTag). */
const TAG_CLIP = "polygon(0 0, calc(100% - 8px) 0, 100% 100%, 0 100%)";

/** The page's `// LABEL ... meta` head, a dashed rule under it. */
function SectionHeadSkeleton({
  label,
  meta,
  marginBottom = 28,
}: {
  label: number;
  meta?: number;
  marginBottom?: number;
}): React.ReactElement {
  return (
    <div
      className="mono-label"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        paddingBottom: 14,
        borderBottom: "1px dashed var(--color-border-subtle)",
        marginBottom,
      }}
    >
      <Skeleton w={label} h={11} style={{ margin: "2px 0" }} />
      {meta !== undefined && <Skeleton w={meta} h={10} style={{ marginLeft: "auto" }} />}
    </div>
  );
}

/** One cell of the briefing card's 2 x 2 grid: a label over its value. */
function BriefingStat({ value, h }: { value: number; h: number }): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Skeleton w={104} h={10} style={{ margin: "3px 0" }} />
      <Skeleton w={value} h={h} />
    </div>
  );
}

/** A hint not yet revealed: the number box, the two lines, the chevron. */
function HintSkeleton(): React.ReactElement {
  return (
    <div
      className="card card--sunken"
      style={{
        display: "grid",
        gridTemplateColumns: "36px 1fr auto",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
      }}
    >
      <Skeleton w={36} h={36} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Skeleton w="70%" h={11} />
        <Skeleton w={56} h={10} />
      </div>
      <Skeleton w={8} h={14} />
    </div>
  );
}

/** A row of the statistics card: its name, its figure. */
function StatRow({
  name,
  value,
  ruled,
}: {
  name: number;
  value: number;
  ruled: boolean;
}): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        minHeight: 30,
        padding: "4px 0",
        borderTop: ruled ? "1px dashed var(--color-border-subtle)" : undefined,
      }}
    >
      <Skeleton w={name} h={11} />
      <Skeleton w={value} h={11} />
    </div>
  );
}

export default function ChallengeLoading(): React.ReactElement {
  return (
    <div className="chx" aria-busy="true" aria-label="Chargement du défi">
      {/* Breadcrumb: $ ~ / cyberlearn / défis / slug */}
      <div
        className="card card--sunken"
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "7px 16px",
          marginBottom: 36,
        }}
      >
        <Skeleton w={280} h={12} style={{ margin: "3px 0" }} />
      </div>

      {/* Hero: title, tags and description beside the briefing card */}
      <section aria-hidden="true" className="chx-hero">
        <div>
          <Skeleton w={96} h={11} style={{ marginBottom: 18 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 26 }}>
            <Skeleton w="86%" h="clamp(36px, 4.8vw, 62px)" />
            <Skeleton w="52%" h="clamp(36px, 4.8vw, 62px)" />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
            <Skeleton w={92} h={28} style={{ clipPath: TAG_CLIP }} />
            <Skeleton w={104} h={28} style={{ clipPath: TAG_CLIP }} />
            <Skeleton w={58} h={28} style={{ clipPath: TAG_CLIP }} />
          </div>
          <SkeletonText
            lines={3}
            lastWidth="58%"
            lineHeight={15}
            gap={11}
            style={{ maxWidth: 580 }}
          />
        </div>

        <div className="card card--sunken" style={{ position: "relative", padding: 0 }}>
          <div
            className="mono-label"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 18px",
              borderBottom: "1px solid var(--color-border-subtle)",
            }}
          >
            <Skeleton w={124} h={11} style={{ margin: "2px 0" }} />
            <Skeleton w={92} h={11} />
          </div>
          <div
            style={{
              padding: "22px 22px 18px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px 24px",
            }}
          >
            <BriefingStat value={112} h={26} />
            <BriefingStat value={64} h={18} />
            <BriefingStat value={48} h={18} />
            <BriefingStat value={86} h={18} />
          </div>
          <Skeleton h={50} />
        </div>
      </section>

      {/* Content grid: the challenge on the left, the rail on the right */}
      <div aria-hidden="true" className="chx-body">
        <div>
          {/* Instructions */}
          <div style={{ marginBottom: 32 }}>
            <SectionHeadSkeleton label={104} meta={48} />
            <SkeletonText lines={3} lastWidth="72%" lineHeight={13} gap={11} />
            <Skeleton w="34%" h={16} style={{ margin: "28px 0 12px" }} />
            <SkeletonText
              lines={2}
              lastWidth="48%"
              lineHeight={13}
              gap={11}
              style={{ marginBottom: 16 }}
            />
            <div className="card card--sunken" style={{ padding: "16px 20px" }}>
              <SkeletonText lines={3} lastWidth="40%" lineHeight={12} gap={10} />
            </div>
          </div>

          {/* Machine: the Linux terminal, before it is started */}
          <div style={{ marginBottom: 32 }}>
            <SectionHeadSkeleton label={80} meta={260} />
            <div
              style={{
                margin: "32px 0",
                border: "1px solid var(--color-border-subtle)",
                background: "var(--cosmetic-terminal-bg, var(--color-bg-base))",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "11px 16px",
                  borderBottom: "1px solid var(--color-border-subtle)",
                }}
              >
                <div style={{ display: "inline-flex", gap: 7, flexShrink: 0 }}>
                  <Skeleton w={11} h={11} radius="circle" />
                  <Skeleton w={11} h={11} radius="circle" />
                  <Skeleton w={11} h={11} radius="circle" />
                </div>
                <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                  <Skeleton w={170} h={11} style={{ margin: "2px 0" }} />
                </div>
                <Skeleton w={76} h={10} />
              </div>
              <div
                style={{
                  height: 380,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 14,
                  padding: 24,
                }}
              >
                <SkeletonText
                  lines={2}
                  lastWidth="62%"
                  lineHeight={12}
                  gap={8}
                  style={{ width: "100%", maxWidth: 520, alignItems: "center" }}
                />
                <Skeleton w={190} h={34} />
              </div>
            </div>
          </div>

          {/* Flag form */}
          <div style={{ marginBottom: 32 }}>
            <SectionHeadSkeleton label={140} />
            <div
              style={{
                padding: "24px 28px",
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Skeleton w={110} h={11} style={{ marginBottom: 4 }} />
                <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
                  <Skeleton h={42} style={{ flex: 1 }} />
                  <Skeleton w={132} h={42} />
                </div>
                <Skeleton w={210} h={11} />
              </div>
            </div>
          </div>
        </div>

        {/* Right rail */}
        <aside className="chx-rail">
          <section>
            <SectionHeadSkeleton label={72} meta={84} marginBottom={20} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <HintSkeleton />
              <HintSkeleton />
            </div>
          </section>

          <section>
            <SectionHeadSkeleton label={110} marginBottom={16} />
            <div className="card card--sunken" style={{ padding: "14px 16px" }}>
              <StatRow name={84} value={24} ruled={false} />
              <StatRow name={112} value={52} ruled />
              <StatRow name={84} value={96} ruled />
            </div>
          </section>
        </aside>
      </div>

      {/* Previous / next challenge */}
      <nav
        aria-hidden="true"
        style={{
          marginTop: 64,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          border: "1px solid var(--color-border-subtle)",
          background: "color-mix(in srgb, var(--color-bg-elevated) 50%, transparent)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 8,
            padding: "22px 24px",
            minHeight: 70,
          }}
        >
          <Skeleton w={150} h={12} />
          <Skeleton w={190} h={9} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 8,
            padding: "22px 24px",
            minHeight: 70,
            borderLeft: "1px solid var(--color-border-subtle)",
          }}
        >
          <Skeleton w={130} h={12} />
          <Skeleton w={170} h={9} />
        </div>
      </nav>
    </div>
  );
}
