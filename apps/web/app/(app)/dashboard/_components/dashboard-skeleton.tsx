import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * The dashboard while it loads, drawn on the page's own classes (the `.dash-*`
 * rules in globals.css): the greeting and the level ring, the mission card
 * with its module route, the revisions due beside the week's quests and
 * streak, and the line saying where the reader stands. Shared by `loading.tsx`
 * (route navigation) and the page's `<Suspense>` fallback.
 */

const QUESTS = [0, 1, 2, 3];
const REVIEWS = [0, 1, 2];
const ROUTE_NODES = [0, 1, 2, 3, 4, 5, 6];
const FIGURES = [
  { value: 22, label: 104, detail: 68 },
  { value: 30, label: 92, detail: 84 },
  { value: 22, label: 50, detail: 76 },
  { value: 16, label: 72, detail: 96 },
];

function Hero(): React.ReactElement {
  return (
    <section className="dash-hero">
      <div>
        <Skeleton w={170} h={12} style={{ marginBottom: 14 }} />
        <Skeleton w={300} h={40} style={{ maxWidth: "100%" }} />
        <div className="dash-hero-sub">
          <Skeleton w={130} h={15} style={{ margin: "4px 0" }} />
          <Skeleton w={160} h={15} style={{ margin: "4px 0" }} />
        </div>
      </div>
      <div className="dash-lvl">
        <div className="dash-ring">
          <Skeleton w="100%" h="100%" radius="circle" />
        </div>
        <div className="dash-lvl-text">
          <Skeleton w={120} h={16} style={{ margin: "2px 0" }} />
          <Skeleton w={130} h={13} style={{ margin: "2px 0" }} />
          <Skeleton w={200} h={12} style={{ margin: "2px 0" }} />
          <Skeleton w={150} h={12} style={{ margin: "2px 0" }} />
        </div>
      </div>
    </section>
  );
}

function Mission(): React.ReactElement {
  return (
    <section className="dash-now">
      <div className="dash-now-main">
        <div className="dash-now-label">
          <Skeleton w={130} h={11} />
          <Skeleton w={170} h={11} />
        </div>
        <Skeleton w="78%" h={26} style={{ marginTop: 16 }} />
        <SkeletonText
          lines={2}
          lastWidth="62%"
          lineHeight={14}
          gap={8}
          style={{ marginTop: 14, maxWidth: "46ch" }}
        />
        <div className="dash-now-foot">
          <Skeleton w={200} h={44} />
          <Skeleton w={120} h={12} />
          <Skeleton w={110} h={13} style={{ marginLeft: "auto" }} />
        </div>
      </div>
      <div className="dash-route">
        <div className="dash-route-head">
          <Skeleton w={170} h={13} />
          <Skeleton w={36} h={13} />
        </div>
        <div className="dash-route-track">
          <i className="dash-route-line" />
          {ROUTE_NODES.map((i) => (
            <Skeleton key={i} w={12} h={12} radius="circle" style={{ position: "relative" }} />
          ))}
        </div>
        <div className="dash-route-foot">
          <Skeleton w={170} h={12} />
          <Skeleton w={110} h={12} />
        </div>
      </div>
    </section>
  );
}

function Reviews(): React.ReactElement {
  return (
    <section className="dash-sec">
      <div className="dash-sec-head">
        <Skeleton w={190} h={17} />
        <div className="dash-sec-count">
          <Skeleton w={110} h={12} />
        </div>
        <Skeleton w={80} h={13} style={{ marginLeft: "auto" }} />
      </div>
      <ul className="dash-rev-list">
        {REVIEWS.map((i) => (
          <li key={i}>
            <div className="dash-rev">
              <Skeleton w={8} h={8} radius="circle" />
              <div>
                <Skeleton w="68%" h={14} style={{ marginBottom: 6 }} />
                <Skeleton w={110} h={11} />
              </div>
              <Skeleton w={78} h={12} />
              <div className="dash-rev-min">
                <Skeleton w={42} h={12} />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <Skeleton w="82%" h={12} style={{ marginTop: 4 }} />
    </section>
  );
}

function Week(): React.ReactElement {
  return (
    <section className="dash-sec">
      <div className="dash-sec-head">
        <Skeleton w={130} h={17} />
        <div className="dash-sec-count">
          <Skeleton w={110} h={12} />
        </div>
      </div>
      <div className="dash-week">
        <div className="dash-card">
          <div className="dash-card-head">
            <Skeleton w={60} h={14} />
            <Skeleton w={34} h={12} style={{ marginLeft: "auto" }} />
          </div>
          <Skeleton h={4} className="dash-qbar" />
          <ul className="dash-quest-list">
            {QUESTS.map((i) => (
              <li key={i} className="dash-quest">
                <Skeleton w={18} h={18} style={{ flexShrink: 0 }} />
                <div className="dash-quest-title">
                  <Skeleton w={i % 2 === 0 ? "72%" : "58%"} h={13} />
                </div>
                <Skeleton w={30} h={12} />
              </li>
            ))}
          </ul>
          <div className="dash-bonus">
            <div className="dash-bonus-title">
              <Skeleton w={190} h={10} />
            </div>
            <Skeleton w={230} h={12} />
          </div>
        </div>
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
          <Skeleton w="88%" h={12} style={{ marginTop: 16 }} />
        </div>
      </div>
    </section>
  );
}

function Standing(): React.ReactElement {
  return (
    <section className="dash-sec">
      <div className="dash-sec-head">
        <Skeleton w={110} h={17} />
        <Skeleton w={90} h={13} style={{ marginLeft: "auto" }} />
      </div>
      <div className="dash-me">
        <div className="dash-figs">
          {FIGURES.map((fig, i) => (
            <div key={i} className="dash-fig">
              <Skeleton w={fig.value} h={22} />
              <span>
                <Skeleton w={fig.label} h={13} style={{ marginBottom: 4 }} />
                <Skeleton w={fig.detail} h={11} />
              </span>
            </div>
          ))}
        </div>
        <div className="dash-badges">
          {[0, 1, 2].map((i) => (
            <div key={i} className="dash-badge">
              <Skeleton w={52} h={60} style={{ flexShrink: 0 }} />
              <div>
                <Skeleton w={96} h={13} />
                <Skeleton w={52} h={11} />
              </div>
            </div>
          ))}
          <Skeleton w={66} h={13} />
        </div>
      </div>
    </section>
  );
}

export function DashboardSkeleton(): React.ReactElement {
  return (
    <div className="page-container" aria-busy="true" aria-label="Chargement du tableau de bord">
      <div className="dash" aria-hidden="true">
        <Hero />
        <Mission />
        <div className="dash-cols">
          <Reviews />
          <Week />
        </div>
        <Standing />
      </div>
    </div>
  );
}
