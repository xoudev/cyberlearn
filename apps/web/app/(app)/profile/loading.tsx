import React from "react";
import { Skeleton, SkeletonCard, SkeletonText } from "@/components/ui/skeleton";

/**
 * The profile while it loads, drawn on the page's own classes and layout
 * (profile/page.tsx, profile-content.tsx, streak-card.tsx): the breadcrumb,
 * the `catalog-header-grid` hero (hex avatar, identity, `card card--sunken`
 * recap, ghost edit button), the `profile-xp-bar`, the five `stat-tile`
 * cells of `profile-stats-grid`, the streak `dash-card` with its year, then
 * the `tabs` and the grid of badge cards. The XP strip and the badge card
 * have no surface class of their own, so they stand on `SkeletonCard`.
 */

/** Activité, Badges, Certificats: each label's width in 11px mono. */
const TABS = [76, 58, 104];
/** The heatmap: 53 weeks of 11px cells, 3px apart. */
const HEAT_WIDTH = 53 * 14 - 3;
const HEAT_HEIGHT = 7 * 14 - 3;

function BadgeCardSkeleton(): React.ReactElement {
  return (
    <SkeletonCard
      style={{
        position: "relative",
        padding: "26px 20px 22px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Skeleton w={52} h={9} style={{ position: "absolute", top: 12, left: 12 }} />
      <Skeleton w={95} h={110} style={{ margin: "8px 0 18px" }} />
      <Skeleton w={80} h={9} style={{ marginBottom: 12 }} />
      <Skeleton w="70%" h={17} style={{ marginBottom: 12 }} />
      <SkeletonText
        lines={3}
        lastWidth="55%"
        lineHeight={11}
        gap={8}
        style={{ width: "100%", alignItems: "center", marginBottom: 20 }}
      />
      <div
        style={{
          marginTop: "auto",
          width: "100%",
          paddingTop: 14,
          borderTop: "1px solid var(--color-border-subtle)",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Skeleton w="80%" h={10} />
      </div>
    </SkeletonCard>
  );
}

function Hero(): React.ReactElement {
  return (
    <section
      className="catalog-header-grid"
      aria-hidden="true"
      style={{
        marginBottom: 56,
        paddingBottom: 40,
        borderBottom: "1px solid var(--color-border-subtle)",
        alignItems: "start",
      }}
    >
      <div style={{ display: "flex", gap: 28, alignItems: "flex-start", flexWrap: "wrap" }}>
        <Skeleton w={156} h={180} style={{ flexShrink: 0 }} />
        <div style={{ paddingTop: 6, minWidth: 0, flex: "1 1 260px" }}>
          <Skeleton
            w={320}
            h="clamp(38px, 4.75vw, 61px)"
            style={{ maxWidth: "100%", marginBottom: 14 }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              margin: "0 0 16px",
            }}
          >
            <Skeleton w={112} h={30} />
            <Skeleton w={64} h={10} />
          </div>
          <Skeleton w={170} h={13} style={{ margin: "3px 0 27px" }} />
          <Skeleton w={210} h={10} style={{ margin: "3px 0" }} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card card--sunken" style={{ position: "relative", padding: "24px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 17 }}>
            <Skeleton w={130} h={10} />
            <Skeleton w={40} h={10} style={{ marginLeft: "auto" }} />
          </div>
          <Skeleton w={280} h={58} style={{ maxWidth: "100%", marginBottom: 14 }} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              paddingTop: 17,
              paddingBottom: 3,
              borderTop: "1px dashed var(--color-border-subtle)",
            }}
          >
            <Skeleton w={52} h={10} />
            <Skeleton w={96} h={10} />
            <Skeleton w={90} h={10} />
          </div>
        </div>
        <div className="btn btn--ghost">
          <Skeleton w={150} h={11} />
        </div>
      </div>
    </section>
  );
}

function XpStrip(): React.ReactElement {
  return (
    <SkeletonCard
      className="profile-xp-bar"
      aria-hidden="true"
      style={{ position: "relative", marginBottom: 56 }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
        <Skeleton w={96} h={82} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 4 }}>
          <Skeleton w={92} h={10} />
          <Skeleton w={84} h={16} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 12,
          }}
        >
          <Skeleton w={170} h={18} />
          <Skeleton w={96} h={10} />
          <Skeleton w={34} h={10} />
        </div>
        <Skeleton h={10} style={{ marginBottom: 22 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
        <Skeleton w={120} h={28} />
        <Skeleton w={180} h={11} style={{ maxWidth: "100%" }} />
      </div>
    </SkeletonCard>
  );
}

function Stats(): React.ReactElement {
  return (
    <div
      className="profile-stats-grid card card--sunken"
      aria-hidden="true"
      style={{ marginBottom: 64 }}
    >
      {[84, 70, 76, 76, 104].map((label, i) => (
        <div key={i} className="stat-tile stat-tile--lg profile-stats-cell">
          <div className="stat-tile__label">
            <Skeleton w={label} h={10} />
          </div>
          <Skeleton w={i === 1 ? 72 : 56} h={47} />
          <Skeleton w={i === 3 ? 140 : 100} h={10} style={{ marginTop: 10 }} />
        </div>
      ))}
    </div>
  );
}

function Streak(): React.ReactElement {
  return (
    <div style={{ marginBottom: 56 }} aria-hidden="true">
      <Skeleton w={140} h={10} style={{ marginBottom: 19 }} />
      <div className="dash-card dash-card--streak">
        <div className="dash-card-head">
          <Skeleton w={48} h={14} />
          <Skeleton w={100} h={12} style={{ marginLeft: "auto" }} />
        </div>
        <div className="dash-streak-top">
          <Skeleton w={36} h={34} />
          <Skeleton w={110} h={14} />
        </div>
        <div className="dash-days">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="dash-day">
              <Skeleton w="100%" h={8} />
              <Skeleton w={8} h={11} />
            </div>
          ))}
        </div>
        <Skeleton w={360} h={12} style={{ maxWidth: "100%", marginTop: 16 }} />
        <div className="dash-streak-year">
          <div className="dash-figs">
            {[0, 1].map((i) => (
              <div key={i} className="dash-fig">
                <Skeleton w={44} h={22} />
                <span>
                  <Skeleton w={110} h={13} style={{ marginBottom: 4 }} />
                  <Skeleton w={180} h={11} />
                </span>
              </div>
            ))}
          </div>
          <div className="dash-heat-head">
            <Skeleton w={150} h={10} />
            <Skeleton w={110} h={10} />
          </div>
          <div className="dash-heat">
            <div className="dash-heat-months">
              <span className="dash-heat-gutter" />
              <Skeleton w={HEAT_WIDTH} h={10} />
            </div>
            <div className="dash-heat-body">
              <div className="dash-heat-days" />
              <Skeleton w={HEAT_WIDTH} h={HEAT_HEIGHT} style={{ flexShrink: 0 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Sections(): React.ReactElement {
  return (
    <div aria-hidden="true">
      <div className="tabs">
        {TABS.map((w) => (
          <div key={w} className="tabs__tab">
            <Skeleton w={w} h={11} />
            <Skeleton w={22} h={15} />
          </div>
        ))}
        <div className="tabs__trailing">
          <Skeleton w={210} h={10} />
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 16,
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <BadgeCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default function ProfileLoading(): React.ReactElement {
  return (
    <div className="page-container" aria-busy="true" aria-label="Chargement du profil">
      <div className="pg-crumb" aria-hidden="true">
        <Skeleton w={250} h={12} />
      </div>
      <Hero />
      <XpStrip />
      <Stats />
      <Streak />
      <Sections />
    </div>
  );
}
