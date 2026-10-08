import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import "../_components/duels.css";

/**
 * A duel while it loads, drawn on the page's own classes (duels.css): the
 * breadcrumb, then in the duel's column the header and its state, the
 * scoreboard with both sides, and the question with three options, at their
 * real sizes. The eyebrow is a bare bar with its line and margin: .pg-eyebrow
 * would print its "// " before it.
 */

function SideSkeleton({ side }: { side: "reader" | "other" }): React.ReactElement {
  return (
    <div className="dl-side" data-side={side}>
      <div className="dl-side__who">
        <Skeleton w={56} h={56} />
        <div className="dl-side__name">
          <Skeleton w={side === "reader" ? 42 : 72} h={19} />
          <Skeleton w={90} h={11} />
        </div>
      </div>
      <div className="dl-side__stats">
        <Skeleton w={52} h={64} />
        <Skeleton w={89} h={14} />
        <Skeleton w={110} h={11} style={{ margin: "1.5px 0" }} />
      </div>
    </div>
  );
}

export default function DuelLoading(): React.ReactElement {
  return (
    <div className="page-container dl" aria-busy="true" aria-label="Chargement du duel">
      <div className="pg-crumb" aria-hidden="true">
        <Skeleton w={200} h={12} style={{ margin: "3px 0" }} />
      </div>

      <div className="dl-duel" aria-hidden="true">
        <header className="dl-duel-head">
          <div>
            <Skeleton w={170} h={11} style={{ margin: "2.75px 0 16.75px" }} />
            <div className="pg-title">
              {/* 0.8em plus 0.14em above and below: the title's 1.08 line. */}
              <Skeleton w="7.5em" h="0.8em" style={{ maxWidth: "100%", margin: "0.14em 0" }} />
            </div>
            <SkeletonText
              className="pg-lede"
              lines={2}
              lastWidth="12%"
              lineHeight={15}
              gap={9.75}
              style={{ paddingBlock: 4.875 }}
            />
          </div>
          <div className="dl-state">
            <Skeleton w={104} h={27} />
            <Skeleton w={230} h={12} />
          </div>
        </header>

        <div className="dl-board">
          <SideSkeleton side="reader" />
          <div className="dl-board__vs">
            <Skeleton w={66} h={28} style={{ position: "relative" }} />
          </div>
          <SideSkeleton side="other" />
        </div>

        <div className="dl-play">
          <div className="dl-q">
            <Skeleton w={240} h={12} style={{ marginBottom: 20 }} />
            <SkeletonText
              lines={2}
              lastWidth="45%"
              lineHeight={28}
              gap={10}
              style={{ marginBottom: 28 }}
            />
            <div className="dl-opts">
              {[0, 1, 2].map((i) => (
                <div key={i} className="dl-opt">
                  <Skeleton w={36} h={36} />
                  <Skeleton w={["62%", "48%", "56%"][i] ?? "50%"} h={14} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
