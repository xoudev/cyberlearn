import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import "./exam.css";

/**
 * The final exam while it loads, drawn on the intro screen's own classes
 * (exam.css): the framed window and its bar, the title, the brief, the three
 * figures and the start button on the left, the four rules and the honour
 * note on the right.
 */

/** One rule of the right column: its hexagon frame, a title, two lines. */
function RuleSkeleton({ warn = false }: { warn?: boolean }): React.ReactElement {
  return (
    <div className={warn ? "rule rule--warn" : "rule"}>
      <span className="rule__ico" />
      <div className="rule__body">
        <Skeleton w="58%" h={14} style={{ margin: "2px 0 8px" }} />
        <SkeletonText lines={2} lastWidth="64%" lineHeight={11} gap={8} />
      </div>
    </div>
  );
}

/** One of the three figures under the brief: its frame, the value, the label. */
function StatSkeleton(): React.ReactElement {
  return (
    <div className="exam-stat">
      <span className="exam-stat__hex" />
      <Skeleton w={56} h={28} style={{ margin: "0 auto" }} />
      <Skeleton w={78} h={9} style={{ margin: "9px auto 0" }} />
    </div>
  );
}

export default function ExamLoading(): React.ReactElement {
  return (
    <div className="exam-root" aria-busy="true" aria-label="Chargement de l'examen">
      <div className="exam-bg" aria-hidden="true">
        <div className="exam-bg__glow1" />
        <div className="exam-bg__glow2" />
        <div className="exam-bg__grid" />
      </div>

      <div className="exam-stage" aria-hidden="true">
        <div className="exam-frame">
          <div className="exam-bar">
            <span className="exam-bar__dots">
              <i />
              <i />
              <i />
            </span>
            <Skeleton w={300} h={11} style={{ maxWidth: "50%" }} />
            <Skeleton w={150} h={10} style={{ marginLeft: "auto" }} />
          </div>

          <div className="exam-body">
            <section className="exam-left">
              <span className="exam-eyebrow">
                <Skeleton w={150} h={12} />
              </span>
              {/* .exam-title: clamp(38px, 4.6vw, 60px), two balanced lines. */}
              <Skeleton w="86%" h="clamp(32px, 3.9vw, 52px)" style={{ marginBottom: 7 }} />
              <Skeleton w="58%" h="clamp(32px, 3.9vw, 52px)" style={{ marginBottom: 16 }} />
              <div className="exam-refcode">
                <Skeleton w={260} h={12} style={{ maxWidth: "100%" }} />
              </div>
              <div className="exam-brief">
                <SkeletonText lines={2} lastWidth="72%" lineHeight={14} gap={10} />
                <SkeletonText
                  lines={3}
                  lastWidth="48%"
                  lineHeight={14}
                  gap={10}
                  style={{ marginTop: 21 }}
                />
              </div>
              <div className="exam-stats">
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
              </div>
              <div className="exam-cta-row">
                {/* Grows like .exam-start, and keeps its height once the row stacks. */}
                <Skeleton h={60} style={{ flex: "1 1 auto" }} />
                <Skeleton w={170} h={11} style={{ alignSelf: "center" }} />
              </div>
            </section>

            <aside className="exam-right">
              <div className="exam-right__head">
                <Skeleton w={150} h={12} />
              </div>
              <div className="rules">
                <RuleSkeleton />
                <RuleSkeleton />
                <RuleSkeleton />
                <RuleSkeleton warn />
              </div>
              <div className="exam-note">
                <Skeleton w={13} h={13} />
                <SkeletonText
                  lines={2}
                  lastWidth="55%"
                  lineHeight={10}
                  gap={7}
                  style={{ flex: 1 }}
                />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
