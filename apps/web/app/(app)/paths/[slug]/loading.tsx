import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import "./path-detail.css";

/**
 * A path while it loads, drawn on the page's own classes (path-detail.css):
 * the breadcrumb, the hero and its brief topped by the path's cover, the
 * progress line, then the checkpoint path (a module gate, missions
 * alternating sides of the rail, the certificate at the end) beside the
 * objectives and the rating.
 */

/** One mission card on its side of the rail (.cp-card). */
function MissionCardSkeleton(): React.ReactElement {
  return (
    <div className="cp-cell cp-cell--card">
      <div className="cp-card">
        <span className="cp-card__leader" />
        <div className="cp-card__head">
          <Skeleton w={84} h={9} />
          <Skeleton w={72} h={18} style={{ marginLeft: "auto" }} />
        </div>
        <Skeleton w="78%" h={17} style={{ marginBottom: 12 }} />
        <div className="cp-card__meta">
          <Skeleton w={72} h={17} />
          <Skeleton w={52} h={10} />
          <Skeleton w={40} h={10} />
        </div>
        <div className="cp-card__action">
          <Skeleton w={150} h={11} />
        </div>
      </div>
    </div>
  );
}

/** A row of the serpentine: the card on one side, the node on the rail. */
function MissionRowSkeleton({ index }: { index: number }): React.ReactElement {
  const left = index % 2 === 0;
  return (
    <div
      className={`cp-row ${left ? "is-left" : "is-right"}${index === 0 ? " cp-row--first" : ""}`}
    >
      {left ? <MissionCardSkeleton /> : <div className="cp-cell cp-cell--empty" />}
      <div className="cp-mid">
        <span className="cp-node">
          <Skeleton className="cp-node__n" w={18} h={13} />
        </span>
      </div>
      {left ? <div className="cp-cell cp-cell--empty" /> : <MissionCardSkeleton />}
    </div>
  );
}

export default function PathDetailLoading(): React.ReactElement {
  return (
    <div className="pd2" aria-busy="true" aria-label="Chargement du parcours">
      <div className="pg-crumb" aria-hidden="true">
        <Skeleton w={330} h={14} />
      </div>

      <section className="pd2-hero" aria-hidden="true">
        <div>
          <div className="pd2-hero__tags">
            <Skeleton w={84} h={24} />
            <Skeleton w={104} h={24} />
            <Skeleton w={112} h={24} />
          </div>
          {/* .pd2-title: clamp(46px, 5.6vw, 82px), two balanced lines. */}
          <Skeleton w="84%" h="clamp(40px, 4.9vw, 70px)" style={{ marginBottom: 7 }} />
          <Skeleton w="58%" h="clamp(40px, 4.9vw, 70px)" style={{ marginBottom: 20 }} />
          <SkeletonText
            lines={3}
            lastWidth="46%"
            lineHeight={15}
            gap={10}
            style={{ maxWidth: 600 }}
          />
        </div>

        <div className="brief">
          {/* The path's cover, edge to edge across the top of the brief. */}
          <div className="brief__cover">
            <Skeleton style={{ aspectRatio: "16 / 7" }} />
          </div>
          <div className="brief__eyebrow">
            <Skeleton w={118} h={10} />
          </div>
          <div className="brief__grid">
            {[64, 92, 64].map((label, i) => (
              <div key={i} className="brief__cell">
                <Skeleton w={label} h={9} style={{ marginBottom: 8 }} />
                <Skeleton w={i === 2 ? 96 : 64} h={26} />
              </div>
            ))}
            <div className="brief__cell brief__cell--cert">
              <Skeleton w={18} h={18} />
              <div>
                <Skeleton w={84} h={10} style={{ marginBottom: 5 }} />
                <Skeleton w={60} h={10} />
              </div>
            </div>
          </div>
          <Skeleton h={48} style={{ marginTop: 18 }} />
        </div>
      </section>

      <div className="pd2-prog" aria-hidden="true">
        <Skeleton w={112} h={16} />
        <Skeleton className="pd2-prog__bar" h={8} />
        <Skeleton w={100} h={11} />
      </div>

      <div className="pd2-body" aria-hidden="true">
        <div className="cpath">
          <div className="cp-gate">
            <div className="cp-gate__side cp-gate__side--l">
              <span className="cp-gate__rule" />
              <span className="cp-gate__label">
                <Skeleton w={84} h={11} />
                <Skeleton w={130} h={11} style={{ marginTop: 6 }} />
              </span>
            </div>
            <div className="cp-mid">
              <span className="cp-gate__marker" />
            </div>
            <div className="cp-gate__side">
              <Skeleton w={104} h={34} />
              <Skeleton w={72} h={10} />
              <span className="cp-gate__rule" />
            </div>
          </div>

          {[0, 1, 2, 3, 4].map((i) => (
            <MissionRowSkeleton key={i} index={i} />
          ))}

          <div className="cp-final">
            <div className="cp-cell cp-cell--empty" />
            <div className="cp-mid" />
            <div className="cp-cell cp-cell--empty" />
            <div className="cp-boss">
              <span className="cp-boss__connector" />
              <Skeleton w={230} h={10} style={{ marginBottom: 22 }} />
              <Skeleton w={116} h={132} style={{ marginBottom: 22 }} />
              <Skeleton w={340} h={26} style={{ maxWidth: "100%", marginBottom: 12 }} />
              <SkeletonText
                lines={2}
                lastWidth="70%"
                lineHeight={12}
                gap={9}
                style={{ width: "100%", maxWidth: 460, marginBottom: 22 }}
              />
              <Skeleton w={300} h={40} style={{ maxWidth: "100%" }} />
            </div>
          </div>
        </div>

        <aside className="pd2-aside">
          <div className="ablock">
            <div className="ablock__eyebrow">
              <Skeleton w={112} h={10} />
            </div>
            <Skeleton w={190} h={15} style={{ marginBottom: 16 }} />
            <ul className="skill-list">
              {["62%", "48%", "70%", "40%", "56%"].map((last, i) => (
                <li key={i}>
                  <SkeletonText
                    lines={2}
                    lastWidth={last}
                    lineHeight={11}
                    gap={8}
                    style={{ flex: 1, marginTop: 4 }}
                  />
                </li>
              ))}
            </ul>
          </div>
          <div className="ablock">
            <div className="ablock__eyebrow">
              <Skeleton w={96} h={10} />
            </div>
            <div className="card card--sunken" style={{ padding: "28px 32px" }}>
              <Skeleton w={90} h={10} style={{ marginBottom: 8 }} />
              <Skeleton w={150} h={15} style={{ marginBottom: 20 }} />
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} w={28} h={28} />
                ))}
              </div>
              <Skeleton w={150} h={34} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
