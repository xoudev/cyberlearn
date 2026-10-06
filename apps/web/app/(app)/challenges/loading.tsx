import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import "./_components/challenges.css";

/**
 * The challenges list while it loads, drawn on the page's own classes
 * (challenges.css): the header and its tally, the three steps, the week's
 * challenge, the tabs and three cards, at their real sizes.
 */

function CardSkeleton(): React.ReactElement {
  return (
    <div className="dfx-card" aria-hidden="true">
      <div className="dfx-card__peek">
        <div className="dfx-card__peek-top">
          <Skeleton w={64} h={10} />
          <Skeleton w={78} h={20} />
        </div>
        <SkeletonText lines={3} lastWidth="70%" lineHeight={10} gap={9} />
      </div>
      <div className="dfx-card__body">
        <Skeleton w={110} h={10} style={{ marginBottom: 12 }} />
        <Skeleton w="72%" h={19} style={{ marginBottom: 12 }} />
        <SkeletonText lines={2} lastWidth="60%" lineHeight={12} gap={8} />
        <div className="dfx-card__meta" style={{ paddingTop: 18 }}>
          <Skeleton w={60} h={11} />
          <Skeleton w={70} h={11} />
        </div>
      </div>
      <div className="dfx-card__go">
        <Skeleton w={140} h={11} />
      </div>
    </div>
  );
}

export default function ChallengesLoading(): React.ReactElement {
  return (
    <div className="chx dfx" aria-busy="true" aria-label="Chargement des défis">
      <header className="dfx-head">
        <div>
          <Skeleton w={210} h={14} style={{ marginBottom: 26 }} />
          <Skeleton w={190} h={58} style={{ marginBottom: 18 }} />
          <SkeletonText
            lines={2}
            lastWidth="55%"
            lineHeight={14}
            gap={10}
            style={{ maxWidth: 560 }}
          />
        </div>
        <div className="dfx-tally">
          <Skeleton w={84} h={12} />
          <Skeleton w={104} h={12} />
          <Skeleton w={104} h={12} />
        </div>
      </header>

      <ol className="dfx-steps" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <Skeleton w={18} h={12} />
            <div>
              <Skeleton w="55%" h={15} style={{ marginBottom: 10 }} />
              <SkeletonText lines={2} lastWidth="70%" lineHeight={12} gap={8} />
            </div>
          </li>
        ))}
      </ol>

      <div className="dfx-week" aria-hidden="true">
        <div className="dfx-week__main">
          <Skeleton w={220} h={11} style={{ marginBottom: 18 }} />
          <Skeleton w="62%" h={40} style={{ marginBottom: 18 }} />
          <SkeletonText lines={2} lastWidth="65%" lineHeight={14} gap={10} />
          <div className="dfx-tags" style={{ marginTop: 22 }}>
            <Skeleton w={78} h={24} />
            <Skeleton w={78} h={24} />
            <Skeleton w={48} h={24} />
          </div>
          <div className="dfx-week__cta">
            <Skeleton w={210} h={50} />
            <Skeleton w={150} h={13} />
          </div>
        </div>
        <div className="dfx-week__side">
          <div className="dfx-week__side-head">
            <Skeleton w={96} h={10} />
            <Skeleton w={52} h={10} />
          </div>
          <SkeletonText lines={5} lastWidth="40%" lineHeight={12} gap={11} />
          <div className="dfx-facts">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <Skeleton w={70} h={12} />
                <Skeleton w={130} h={12} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dfx-list-head" aria-hidden="true">
        <Skeleton w={190} h={26} style={{ marginBottom: 12 }} />
        <div style={{ display: "flex", gap: 18, paddingBottom: 14 }}>
          <Skeleton w={66} h={12} />
          <Skeleton w={82} h={12} />
          <Skeleton w={88} h={12} />
        </div>
      </div>
      <div className="dfx-grid">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
