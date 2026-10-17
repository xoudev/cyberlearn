import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import "./public-profile.css";

/**
 * A public profile while it loads, drawn on the page's own classes
 * (public-profile.css) and in the frame the layout gives it, the app's shell
 * or the page alone: the breadcrumb, the player card (the hexagonal avatar,
 * the identity, the level block), the stats strip of five lg stat tiles,
 * the year of activity, then the badges, the skills and the recent lessons,
 * at their real sizes.
 * The eyebrow is a bare bar: .pg-eyebrow would print its "// " before it.
 */

/** The avatar's and the badges' pointy-top hexagon, as the page cuts it. */
const HEX_CLIP = "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)";

/** SectionLabel: the ruled eyebrow over the section's title. */
function SectionLabelSkeleton({
  eyebrow,
  title,
}: {
  eyebrow: number;
  title: number;
}): React.ReactElement {
  return (
    <div className="pp-sec">
      <div className="pp-sec__eyebrow">
        <Skeleton w={eyebrow} h={11} style={{ margin: "3px 0" }} />
      </div>
      <div className="pp-sec__title">
        <Skeleton w={title} h="1em" style={{ maxWidth: "100%" }} />
      </div>
    </div>
  );
}

/** A row of the recent lessons: its number, category over title, and date. */
function LessonRowSkeleton({ title }: { title: string }): React.ReactElement {
  return (
    <div className="pp-row">
      <div className="pp-row__n">
        <Skeleton w={28} h={22} />
      </div>
      <div className="pp-row__main">
        <Skeleton w={64} h={9} style={{ margin: "2px 0 6px" }} />
        <Skeleton w={title} h={15} style={{ margin: "4px 0" }} />
      </div>
      <Skeleton w={58} h={11} style={{ flexShrink: 0 }} />
    </div>
  );
}

export default function PublicProfileLoading(): React.ReactElement {
  return (
    <div className="page-container" aria-busy="true" aria-label="Chargement du profil">
      <div aria-hidden="true">
        <div className="pg-crumb">
          <Skeleton w={170} h={12} style={{ margin: "3px 0" }} />
        </div>

        {/* Player card */}
        <div className="pp-hero">
          <Skeleton w={96} h={110} style={{ flexShrink: 0, clipPath: HEX_CLIP }} />

          <div className="pp-identity">
            <Skeleton w={300} h={11} style={{ maxWidth: "100%", margin: "2.75px 0 16.75px" }} />
            <div className="pg-title pp-title">
              <Skeleton w="min(420px, 100%)" h="0.86em" style={{ margin: "0.07em 0" }} />
            </div>
            <Skeleton w={120} h={12} style={{ margin: "3px 0 15px" }} />
            <SkeletonText
              lines={2}
              lastWidth="60%"
              lineHeight={13}
              gap={9}
              style={{ maxWidth: 480 }}
            />
          </div>

          <div className="pp-level">
            <Skeleton w={110} h={10} style={{ margin: "3px 0 11px" }} />
            <div className="pp-level__row">
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

        {/* Stats strip: five lg stat tiles */}
        <div className="pp-stats card">
          {[96, 120, 116, 124, 104].map((label, i) => (
            <div key={label} className="stat-tile stat-tile--lg">
              <Skeleton w={label} h={10} style={{ margin: "2px 0" }} />
              <Skeleton w={i === 0 ? 130 : 70} h={38} />
              <Skeleton w={130} h={10} style={{ margin: "-1px 0 3px" }} />
            </div>
          ))}
        </div>

        {/* A year of activity: the figures, then the calendar */}
        <section className="pp-section">
          <SectionLabelSkeleton eyebrow={110} title={320} />
          <div className="card pp-year">
            <div className="pp-year__figs">
              <Skeleton w={210} h={18} />
              <Skeleton w={170} h={18} />
            </div>
            <Skeleton h={10} w={240} style={{ marginBottom: 10 }} />
            <Skeleton h={112} />
          </div>
        </section>

        {/* Badges */}
        <section className="pp-section">
          <SectionLabelSkeleton eyebrow={150} title={250} />
          <div className="pp-badges">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="pp-badge">
                <Skeleton w={95} h={110} style={{ clipPath: HEX_CLIP }} />
                <Skeleton w={80} h={10} style={{ margin: "2px 0" }} />
              </div>
            ))}
          </div>
        </section>

        {/* Skills */}
        <section className="pp-section">
          <SectionLabelSkeleton eyebrow={120} title={260} />
          <div className="pp-skills">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card pp-skill">
                <Skeleton w={70} h={9} style={{ margin: "2px 0 9px" }} />
                <Skeleton w={150} h={15} style={{ margin: "4px 0" }} />
                <Skeleton w="80%" h={12} style={{ margin: "12px 0 4px" }} />
              </div>
            ))}
          </div>
        </section>

        {/* Recent lessons */}
        <section className="pp-section">
          <SectionLabelSkeleton eyebrow={110} title={380} />
          <div className="card">
            {["58%", "44%", "66%", "50%", "40%"].map((title) => (
              <LessonRowSkeleton key={title} title={title} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
