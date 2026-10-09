import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import "./_components/duels.css";

/**
 * The duels list while it loads, drawn on the page's own classes (duels.css):
 * the header and the record, the three rules, the new duel panel and three
 * duel cards, at their real sizes. The eyebrow is a bare bar with its line
 * and margin: .pg-eyebrow would print its "// " before it.
 */

function FieldSkeleton(): React.ReactElement {
  return (
    <div className="dl-field">
      <Skeleton w={52} h={10} style={{ margin: "1.5px 0" }} />
      <Skeleton w="100%" h={44} />
    </div>
  );
}

function CardSkeleton(): React.ReactElement {
  return (
    <div className="dl-card" aria-hidden="true">
      <div className="dl-card__top">
        <Skeleton w={96} h={10} />
        <Skeleton w={74} h={19} />
      </div>
      <div className="dl-card__vs">
        <div className="dl-card__side">
          <Skeleton w={36} h={36} />
          <Skeleton w={30} h={14} />
        </div>
        <Skeleton w={78} h={34} />
        <div className="dl-card__side dl-card__side--other">
          <Skeleton w={36} h={36} />
          <Skeleton w={54} h={14} />
        </div>
      </div>
      <div className="dl-card__meta">
        <Skeleton w={160} h={11} />
      </div>
      <div className="dl-card__go">
        <Skeleton w={130} h={11} />
      </div>
    </div>
  );
}

export default function DuelsLoading(): React.ReactElement {
  return (
    <div className="page-container dl" aria-busy="true" aria-label="Chargement des duels">
      <header className="dl-head" aria-hidden="true">
        <div>
          <div className="pg-crumb">
            <Skeleton w={150} h={12} style={{ margin: "3px 0" }} />
          </div>
          <Skeleton w={230} h={11} style={{ margin: "2.75px 0 16.75px" }} />
          <div className="pg-title">
            {/* 0.8em plus 0.14em above and below: the title's 1.08 line. */}
            <Skeleton w="2.9em" h="0.8em" style={{ maxWidth: "100%", margin: "0.14em 0" }} />
          </div>
          <SkeletonText
            className="pg-lede"
            lines={2}
            lastWidth="55%"
            lineHeight={15}
            gap={9.75}
            style={{ paddingBlock: 4.875 }}
          />
        </div>
        <ul className="dl-record">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <Skeleton w={36} h={30} />
              <Skeleton w={62} h={10} style={{ margin: "2px 0" }} />
            </li>
          ))}
        </ul>
      </header>

      <ol className="dl-rules" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <Skeleton w={18} h={12} />
            <div>
              <Skeleton w="70%" h={15} style={{ marginBottom: 10 }} />
              <SkeletonText lines={2} lastWidth="60%" lineHeight={12} gap={8} />
            </div>
          </li>
        ))}
      </ol>

      <div className="dl-section" aria-hidden="true">
        <div className="dl-sec">
          <Skeleton w={200} h={26} style={{ margin: "2.5px 0" }} />
        </div>
        <div className="dl-new">
          <div className="dl-new__versus">
            <div className="dl-new__me">
              <Skeleton w={44} h={44} />
              <Skeleton w={30} h={16} />
            </div>
            <Skeleton w={70} h={26} style={{ marginBottom: 9 }} />
            <div className="dl-new__them">
              <Skeleton w={44} h={44} />
              <FieldSkeleton />
            </div>
          </div>
          <FieldSkeleton />
          <div className="dl-new__go">
            <Skeleton w={190} h={44} />
          </div>
        </div>
      </div>

      <div className="dl-section" aria-hidden="true">
        <div className="dl-sec">
          <Skeleton w={150} h={26} style={{ margin: "2.5px 0" }} />
          <Skeleton w={64} h={11} />
        </div>
        <div className="dl-grid">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}
