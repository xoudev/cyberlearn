import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import "../../_components/tournaments.css";

/**
 * A challenge of a tournament while it loads, drawn on the page's own classes
 * (tournaments.css): the hero (title and tags beside the briefing), the
 * statement and the flag under their dashed heads, and the rail of rules, at
 * their real sizes.
 */

/** A section's head: its title and, when it has one, the figure on the right. */
function SectionHeadSkeleton({
  label,
  meta,
}: {
  label: number;
  meta?: number;
}): React.ReactElement {
  return (
    <div className="trn-shead">
      <Skeleton w={label} h={12} />
      {meta !== undefined && <Skeleton w={meta} h={10} />}
    </div>
  );
}

export default function TournamentChallengeLoading(): React.ReactElement {
  return (
    <div className="page-container trn" aria-busy="true" aria-label="Chargement du défi">
      <Skeleton w={340} h={14} style={{ marginBottom: 26, maxWidth: "100%" }} />

      <div className="trn-hero" aria-hidden="true">
        <div className="trn-hero__main">
          <div className="trn-hero__top">
            <Skeleton w={220} h={11} />
          </div>
          <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
            <Skeleton w="80%" h="clamp(36px, 5vw, 64px)" />
            <Skeleton w="45%" h="clamp(36px, 5vw, 64px)" />
          </div>
          <div className="trn-tags">
            <Skeleton w={88} h={26} />
            <Skeleton w={118} h={26} />
            <Skeleton w={52} h={26} />
          </div>
          <SkeletonText
            lines={3}
            lastWidth="58%"
            lineHeight={15}
            gap={11}
            style={{ maxWidth: 580 }}
          />
        </div>

        <div className="trn-brief">
          <div className="trn-brief__head">
            <Skeleton w={120} h={11} />
            <Skeleton w={86} h={22} />
          </div>
          <div className="trn-brief__stats">
            <div className="trn-stat">
              <Skeleton w={52} h={10} />
              <Skeleton w={110} h={34} />
            </div>
            <div className="trn-stat">
              <Skeleton w={52} h={10} />
              <Skeleton w={92} h={14} />
            </div>
            <div className="trn-stat">
              <Skeleton w={72} h={10} />
              <Skeleton w={80} h={14} />
            </div>
            <div className="trn-stat">
              <Skeleton w={32} h={10} />
              <Skeleton w="90%" h={14} />
            </div>
          </div>
          <div className="trn-brief__cta">
            <Skeleton h={50} />
            <div className="trn-brief__back">
              <Skeleton w={170} h={11} />
            </div>
          </div>
        </div>
      </div>

      <div className="trn-body" aria-hidden="true">
        <div className="trn-body__main">
          <div className="trn-block">
            <SectionHeadSkeleton label={120} meta={52} />
            <SkeletonText lines={3} lastWidth="72%" lineHeight={13} gap={11} />
            <Skeleton w="34%" h={16} style={{ margin: "28px 0 12px" }} />
            <SkeletonText
              lines={2}
              lastWidth="48%"
              lineHeight={13}
              gap={11}
              style={{ marginBottom: 16 }}
            />
            <div className="trn-conn">
              <SkeletonText
                lines={3}
                lastWidth="40%"
                lineHeight={12}
                gap={10}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div className="trn-block">
            <SectionHeadSkeleton label={60} meta={78} />
            <div className="trn-flag">
              <div className="trn-flag__head">
                <Skeleton w={64} h={11} />
                <Skeleton w={72} h={10} />
              </div>
              {/* Sized on their content, not on a zero basis: on a phone the row
                  turns to a column, where a zero basis would flatten them. */}
              <div className="trn-flag__row">
                <Skeleton h={44} style={{ flex: "1 1 auto" }} />
                <Skeleton h={44} style={{ minWidth: 120 }} />
              </div>
              <Skeleton w={260} h={11} style={{ maxWidth: "100%" }} />
            </div>
          </div>
        </div>

        <div className="trn-rail">
          <div className="trn-section">
            <SectionHeadSkeleton label={180} />
            <ol className="trn-rules">
              {[0, 1, 2].map((i) => (
                <li key={i}>
                  <Skeleton w={16} h={11} style={{ marginTop: 4 }} />
                  <SkeletonText lines={2} lastWidth="62%" lineHeight={12} gap={9} />
                </li>
              ))}
            </ol>
          </div>
          <div className="trn-railback">
            <span>
              <Skeleton w={150} h={11} />
              <Skeleton w={120} h={12} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
