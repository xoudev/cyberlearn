import React from "react";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import styles from "./_components/leaderboard.module.css";

/**
 * The leaderboard while it loads, drawn on the page's own classes and layout
 * (LeaderboardClient.tsx, leaderboard.module.css): the breadcrumb, the title
 * with its `tabs`, the meta strip, the `cl-podium` of three (inline-styled
 * cards with no class, so `SkeletonCard`), the `position` banner, and the
 * `players` grid of `card card--sunken` player cards.
 */

/**
 * The podium's stacking below 1280px. LeaderboardClient writes this rule in
 * its own inline `<style>`, which the loading state cannot import: the same
 * rule, so the podium stacks at the same width.
 */
const PODIUM_RULES = `
  @media (max-width: 1279px) {
    .cl-podium {
      grid-template-columns: min(100%, 440px) !important;
      justify-content: center;
      align-items: stretch !important;
      gap: 20px !important;
      margin-bottom: 56px !important;
    }
    .cl-podium > * { transform: none !important; }
    .cl-podium > :nth-child(1) { order: 2; }
    .cl-podium > :nth-child(2) { order: 1; }
    .cl-podium > :nth-child(3) { order: 3; }
  }
`;

/** Global, Amis, Ligue, Ce mois, Cette semaine: each label's width in 11px mono. */
const TAB_WIDTHS = [57, 38, 48, 66, 124];

function PodiumCardSkeleton({ gold }: { gold: boolean }): React.ReactElement {
  return (
    <SkeletonCard
      style={{
        position: "relative",
        padding: "28px 22px 26px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: gold ? 440 : 380,
        transform: gold ? undefined : "translateY(20px)",
      }}
    >
      <Skeleton
        w={124}
        h={31}
        style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)" }}
      />
      <Skeleton w={gold ? 100 : 80} h={gold ? 115 : 92} style={{ margin: "14px 0 18px" }} />
      <Skeleton w={gold ? 170 : 140} h={gold ? 26 : 22} style={{ marginBottom: 8 }} />
      <Skeleton w={110} h={11} style={{ marginBottom: 20 }} />
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <Skeleton w={gold ? 150 : 112} h={gold ? 48 : 36} />
        <Skeleton w={22} h={12} />
      </div>
      <Skeleton w={170} h={30} />
      <Skeleton w={110} h={11} style={{ marginTop: 14 }} />
    </SkeletonCard>
  );
}

function PlayerCardSkeleton(): React.ReactElement {
  return (
    <li className={["card card--sunken", styles.player].join(" ")}>
      <div className={styles.playerTop}>
        <Skeleton w={38} h={24} style={{ margin: "3px 0" }} />
      </div>
      <div className={styles.playerIdentity}>
        <Skeleton w={44} h={51} style={{ flexShrink: 0 }} />
        <div className={styles.identity}>
          <Skeleton w="62%" h={15} style={{ margin: "2px 0" }} />
          <Skeleton w="78%" h={10} />
        </div>
      </div>
      <div className={styles.playerBottom}>
        <Skeleton w={104} h={23} style={{ margin: "3px 0" }} />
        <Skeleton w={44} h={11} />
      </div>
    </li>
  );
}

export default function LeaderboardLoading(): React.ReactElement {
  return (
    <div className="page-container" aria-busy="true" aria-label="Chargement du classement">
      <style>{PODIUM_RULES}</style>

      <div className="pg-crumb" aria-hidden="true">
        <Skeleton w={210} h={12} />
      </div>

      <div
        aria-hidden="true"
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 24,
          marginBottom: 12,
        }}
      >
        <div>
          <Skeleton w={150} h={12} style={{ marginBottom: 17 }} />
          <Skeleton w={620} h="clamp(40px, 5.5vw, 72px)" style={{ maxWidth: "100%" }} />
        </div>
        <div className="tabs">
          {TAB_WIDTHS.map((w) => (
            <div key={w} className="tabs__tab">
              <Skeleton w={w} h={11} style={{ margin: "2px 0" }} />
            </div>
          ))}
        </div>
      </div>

      <div
        aria-hidden="true"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 16,
          margin: "18px 0 48px",
          paddingBottom: 18,
          borderBottom: "1px dashed var(--color-border-default)",
        }}
      >
        <Skeleton w={150} h={11} />
        <Skeleton w={170} h={11} />
      </div>

      <section
        className="cl-podium"
        aria-hidden="true"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.15fr 1fr",
          gap: 24,
          alignItems: "end",
          marginBottom: 96,
        }}
      >
        <PodiumCardSkeleton gold={false} />
        <PodiumCardSkeleton gold />
        <PodiumCardSkeleton gold={false} />
      </section>

      <div className={styles.position} aria-hidden="true">
        <Skeleton w={58} h={32} style={{ margin: "3px 0" }} />
        <div className={styles.identity}>
          <Skeleton w={210} h={10} style={{ maxWidth: "100%" }} />
          <Skeleton w={170} h={10} style={{ maxWidth: "100%" }} />
        </div>
        <Skeleton w={112} h={23} />
      </div>

      <section aria-hidden="true">
        <div className={styles.sectionHeading}>
          <Skeleton w={140} h={12} />
          <Skeleton w={52} h={12} />
        </div>
        <ol className={styles.players}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <PlayerCardSkeleton key={i} />
          ))}
        </ol>
      </section>
    </div>
  );
}
