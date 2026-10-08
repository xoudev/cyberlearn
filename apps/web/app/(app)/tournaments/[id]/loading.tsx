import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import "../_components/tournaments.css";

/**
 * A tournament's scoreboard while it loads, drawn on the page's own classes
 * (tournaments.css): the hero (title, dates, the briefing with its countdown
 * and the reader's place), the grid of challenges with the players under it
 * and the teams' ranking beside, at their real sizes.
 */

/** A challenge card's frame: its top line, its title and points, its foot. */
function ChallengeSkeleton(): React.ReactElement {
  return (
    <div className="trn-ch">
      <div className="trn-ch__top">
        <Skeleton w={64} h={10} />
        <Skeleton w={32} h={10} />
      </div>
      <div className="trn-ch__body">
        <div>
          <Skeleton w="85%" h={17} style={{ marginBottom: 12 }} />
          <Skeleton w={96} h={10} />
        </div>
        <div>
          <Skeleton w={46} h={30} style={{ marginBottom: 6 }} />
          <Skeleton w={24} h={10} style={{ marginLeft: "auto" }} />
        </div>
      </div>
      <div className="trn-ch__foot">
        <Skeleton w={150} h={11} />
        <Skeleton w={110} h={11} />
      </div>
    </div>
  );
}

/** A row of the teams' ranking: its place plate, its name and detail, its points, its bar. */
function TeamSkeleton(): React.ReactElement {
  return (
    <li className="trn-team">
      <span className="trn-place">
        <Skeleton w={24} h={12} />
      </span>
      <span className="trn-team__who">
        <Skeleton w="60%" h={15} />
        <Skeleton w="45%" h={11} />
      </span>
      <span className="trn-team__score">
        <Skeleton w={56} h={20} />
      </span>
      <span className="trn-team__bar" />
    </li>
  );
}

export default function TournamentLoading(): React.ReactElement {
  return (
    <div className="page-container trn" aria-busy="true" aria-label="Chargement du tournoi">
      <Skeleton w={300} h={14} style={{ marginBottom: 26 }} />

      <div className="trn-hero" aria-hidden="true">
        <div className="trn-hero__main">
          <div className="trn-hero__top">
            <Skeleton w={92} h={22} />
            <Skeleton w={210} h={11} />
          </div>
          <Skeleton w="72%" h="clamp(36px, 5vw, 64px)" style={{ marginBottom: 18 }} />
          <SkeletonText
            lines={2}
            lastWidth="60%"
            lineHeight={15}
            gap={11}
            style={{ maxWidth: 560, marginBottom: 28 }}
          />
          <div className="trn-meta">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <Skeleton w={50} h={10} />
                <Skeleton w="80%" h={14} />
              </div>
            ))}
          </div>
        </div>

        <div className="trn-brief">
          <div className="trn-brief__head">
            <Skeleton w={130} h={11} />
            <Skeleton w={64} h={11} />
          </div>
          <div className="trn-brief__clock">
            <div className="trn-clock">
              <Skeleton w={70} h={10} />
              <Skeleton w={200} h={44} />
            </div>
            <div className="trn-window">
              <Skeleton h={6} />
              <Skeleton w={150} h={10} />
            </div>
          </div>
          <div className="trn-standing">
            <Skeleton w="70%" h={14} style={{ marginBottom: 18 }} />
            <div className="trn-standing__stats">
              {[0, 1].map((i) => (
                <div key={i}>
                  <Skeleton w={76} h={10} />
                  <Skeleton w={54} h={40} />
                </div>
              ))}
              {[0, 1].map((i) => (
                <div key={i}>
                  <Skeleton w={68} h={10} />
                  <Skeleton w={44} h={22} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="trn-main" aria-hidden="true">
        <div className="trn-section trn-main__challenges">
          <div className="trn-shead">
            <Skeleton w={70} h={12} />
            <Skeleton w={190} h={10} />
          </div>
          <ul className="trn-grid">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <li key={i}>
                <ChallengeSkeleton />
              </li>
            ))}
          </ul>
        </div>

        <div className="trn-section trn-main__teams">
          <div className="trn-shead">
            <Skeleton w={200} h={12} />
          </div>
          <ol className="trn-teams">
            <TeamSkeleton />
            <TeamSkeleton />
            <TeamSkeleton />
            <TeamSkeleton />
          </ol>
        </div>

        <div className="trn-section trn-main__players">
          <div className="trn-shead">
            <Skeleton w={90} h={12} />
          </div>
          <ol className="trn-players">
            {[0, 1, 2, 3, 4].map((i) => (
              <li key={i} className="trn-player">
                <Skeleton w={28} h={12} />
                <Skeleton w="55%" h={13} />
                <Skeleton w={48} h={13} />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
