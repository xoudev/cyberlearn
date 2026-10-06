import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * A public profile while it loads, drawn on the page's own layout: its gridded
 * backdrop and 1140px column, the top bar, the player card (.pub-hero: the
 * hexagonal avatar, the identity, the level block), the stats strip
 * (.pub-stats card of three lg stat tiles), then the badges, the skills and
 * the recent lessons, at their real sizes. The page's responsive rules are
 * inline in it, so the ones the skeleton needs are repeated here.
 */

const RESPONSIVE_CSS = `
.pub-stats { display: grid; grid-template-columns: repeat(3, 1fr); }
.pub-hero { display: flex; align-items: center; gap: 32px; flex-wrap: wrap; }
@media (max-width: 760px) {
  .pub-stats { grid-template-columns: 1fr; }
  .pub-stats > div { border-right: none !important; border-bottom: 1px solid var(--color-border-default); }
  .pub-stats > div:last-child { border-bottom: none; }
  .pub-level { width: 100%; }
}
`;

/** The avatar's and the badges' pointy-top hexagon, as the page cuts it. */
const HEX_CLIP = "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)";

/** The page's grid lines: its border colour at 14%. */
const GRID_LINE = "color-mix(in srgb, var(--color-border-default) 14%, transparent)";

/** SectionLabel: the ruled eyebrow over the section's title. */
function SectionLabelSkeleton({
  eyebrow,
  title,
}: {
  eyebrow: number;
  title: number;
}): React.ReactElement {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Skeleton w={24} h={1} />
        <Skeleton w={eyebrow} h={11} style={{ margin: "3px 0" }} />
      </div>
      <Skeleton w={title} h="clamp(22px, 3vw, 30px)" style={{ maxWidth: "100%" }} />
    </div>
  );
}

/** A row of the recent lessons: its number, category over title, and date. */
function LessonRowSkeleton({ title, last }: { title: string; last: boolean }): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "14px 20px",
        borderBottom: last ? "none" : "1px solid var(--color-border-subtle)",
      }}
    >
      <div style={{ width: 34, flexShrink: 0 }}>
        <Skeleton w={28} h={22} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Skeleton w={64} h={9} style={{ margin: "2px 0 6px" }} />
        <Skeleton w={title} h={15} style={{ margin: "4px 0" }} />
      </div>
      <Skeleton w={58} h={11} style={{ flexShrink: 0 }} />
    </div>
  );
}

export default function PublicProfileLoading(): React.ReactElement {
  return (
    <div
      aria-busy="true"
      aria-label="Chargement du profil"
      style={{
        minHeight: "100vh",
        background: `linear-gradient(${GRID_LINE} 1px, transparent 1px), linear-gradient(90deg, ${GRID_LINE} 1px, transparent 1px), var(--color-bg-base)`,
        backgroundSize: "44px 44px, 44px 44px, auto",
        padding: "48px 24px 100px",
      }}
    >
      <style>{RESPONSIVE_CSS}</style>
      <div aria-hidden="true" style={{ width: "100%", maxWidth: 1140, margin: "0 auto" }}>
        {/* Top bar: the way back, the profile's eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 36,
            flexWrap: "wrap",
          }}
        >
          <Skeleton w={110} h={11} style={{ margin: "3px 0" }} />
          <Skeleton w={220} h={10} />
        </div>

        {/* Player card */}
        <article
          style={{
            position: "relative",
            padding: "36px 36px 34px",
            background: "color-mix(in srgb, var(--color-bg-elevated) 60%, transparent)",
            border: "1px solid var(--color-border-default)",
            marginBottom: 22,
            overflow: "hidden",
          }}
        >
          <div className="pub-hero">
            <Skeleton w={96} h={110} style={{ flexShrink: 0, clipPath: HEX_CLIP }} />

            <div style={{ flex: 1, minWidth: 260 }}>
              <Skeleton w={340} h={11} style={{ maxWidth: "100%", margin: "3px 0 15px" }} />
              <Skeleton
                w="min(420px, 100%)"
                h="clamp(32px, 4.4vw, 55px)"
                style={{ marginBottom: 12 }}
              />
              <Skeleton w={120} h={12} style={{ margin: "3px 0 15px" }} />
              <SkeletonText
                lines={2}
                lastWidth="60%"
                lineHeight={13}
                gap={9}
                style={{ maxWidth: 480 }}
              />
            </div>

            <div
              className="pub-level card card--sunken"
              style={{ position: "relative", padding: "20px 26px 18px", minWidth: 250 }}
            >
              <Skeleton w={110} h={10} style={{ margin: "3px 0 11px" }} />
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
                <Skeleton w={60} h={50} />
                <Skeleton w={56} h={10} />
              </div>
              {/* XpProgress: the figures, then the bar and the row under it */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Skeleton w={120} h={18} style={{ margin: "4px 0" }} />
                  <Skeleton w={56} h={10} />
                  <Skeleton w={30} h={11} />
                </div>
                <Skeleton h={10} style={{ marginBottom: 22 }} />
              </div>
            </div>
          </div>
        </article>

        {/* Stats strip: three lg stat tiles */}
        <div className="pub-stats card" style={{ marginBottom: 56 }}>
          {[96, 120, 116].map((label, i) => (
            <div
              key={label}
              className="stat-tile stat-tile--lg"
              style={{ borderRight: i < 2 ? "1px solid var(--color-border-default)" : "none" }}
            >
              <Skeleton w={label} h={10} style={{ margin: "2px 0" }} />
              <Skeleton w={i === 0 ? 130 : 70} h={38} />
              <Skeleton w={130} h={10} style={{ margin: "-1px 0 3px" }} />
            </div>
          ))}
        </div>

        {/* Badges */}
        <section style={{ marginBottom: 56 }}>
          <SectionLabelSkeleton eyebrow={150} title={250} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
              gap: "26px 14px",
            }}
          >
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Skeleton w={95} h={110} style={{ clipPath: HEX_CLIP }} />
                <Skeleton w={80} h={10} style={{ margin: "2px 0" }} />
              </div>
            ))}
          </div>
        </section>

        {/* Skills */}
        <section style={{ marginBottom: 56 }}>
          <SectionLabelSkeleton eyebrow={120} title={260} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            {[0, 1, 2].map((i) => (
              <div key={i} className="card" style={{ padding: "16px 18px" }}>
                <Skeleton w={70} h={9} style={{ margin: "2px 0 9px" }} />
                <Skeleton w={150} h={15} style={{ margin: "4px 0" }} />
                <Skeleton w="80%" h={12} style={{ margin: "12px 0 4px" }} />
              </div>
            ))}
          </div>
        </section>

        {/* Recent lessons */}
        <section>
          <SectionLabelSkeleton eyebrow={110} title={380} />
          <div className="card">
            {["58%", "44%", "66%", "50%", "40%"].map((title, i) => (
              <LessonRowSkeleton key={title} title={title} last={i === 4} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
