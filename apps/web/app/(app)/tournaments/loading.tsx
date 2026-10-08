import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import "./_components/tournaments.css";

/**
 * The tournaments list while it loads, drawn on the page's own classes
 * (tournaments.css): the header and its tally, a tournament under way, the
 * three steps and a row of cards, in the page's order and at their real sizes.
 */

/** A tournament card's frame: the date plate, the phase, the title, the counts, the link. */
function CardSkeleton(): React.ReactElement {
  return (
    <div className="trn-card" aria-hidden="true">
      <div className="trn-card__head">
        <span className="trn-date">
          <Skeleton w={30} h={26} />
          <Skeleton w={30} h={10} style={{ marginTop: 4 }} />
        </span>
        <span className="trn-card__headtext">
          <Skeleton w={86} h={22} />
          <Skeleton w={96} h={10} />
        </span>
      </div>
      <div className="trn-card__body">
        <Skeleton w="70%" h={20} style={{ marginBottom: 12 }} />
        <Skeleton w="85%" h={13} style={{ marginBottom: 22 }} />
        <div className="trn-card__meta">
          <Skeleton w={124} h={10} />
          <Skeleton w={62} h={10} />
          <Skeleton w={48} h={10} />
        </div>
      </div>
      <div className="trn-card__go">
        <Skeleton w={140} h={11} />
      </div>
    </div>
  );
}

export default function TournamentsLoading(): React.ReactElement {
  return (
    <div className="page-container trn" aria-busy="true" aria-label="Chargement des tournois">
      <header className="trn-head">
        <div>
          <Skeleton w={210} h={14} style={{ marginBottom: 26 }} />
          <Skeleton w={130} h={11} style={{ marginBottom: 16 }} />
          <Skeleton w={260} h={58} style={{ marginBottom: 18 }} />
          <SkeletonText
            lines={2}
            lastWidth="55%"
            lineHeight={14}
            gap={10}
            style={{ maxWidth: 560 }}
          />
        </div>
        <div className="trn-tally">
          <Skeleton w={84} h={12} />
          <Skeleton w={84} h={12} />
          <Skeleton w={100} h={12} />
        </div>
      </header>

      <div className="trn-featured" aria-hidden="true">
        <div className="trn-live">
          <div className="trn-live__main">
            <Skeleton w={96} h={22} />
            <Skeleton w="58%" h={40} style={{ margin: "18px 0 14px" }} />
            <Skeleton w="64%" h={14} style={{ marginBottom: 28 }} />
            <div className="trn-window">
              <Skeleton h={6} />
              <Skeleton w={150} h={10} />
            </div>
            <div className="trn-live__cta">
              <Skeleton w={260} h={50} />
            </div>
          </div>
          <div className="trn-live__side">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <Skeleton w={60} h={10} />
                <Skeleton w={44} h={26} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <ol className="trn-steps" aria-hidden="true">
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

      <div className="trn-shead" aria-hidden="true">
        <Skeleton w={90} h={12} />
        <Skeleton w={70} h={10} />
      </div>
      <div className="trn-cards">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
