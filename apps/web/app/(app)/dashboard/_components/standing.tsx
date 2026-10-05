import React from "react";
import Link from "next/link";
import {
  BADGE_RARITY_LABELS,
  BADGE_RARITY_VAR,
  BadgeMedallion,
  toBadgeRarity,
} from "@cyberlearn/ui";
import type { DashboardStat } from "@cyberlearn/lib/dashboard/stats";

export interface RecentBadge {
  earnedAt: Date;
  badge: { name: string; rarity: string; iconUrl: string };
}

/**
 * Where the reader stands: the figures in one line, the last badges beside
 * them. The figures and their words are the app's too (dashboard/stats); the
 * profile has the long version, which the heading links to.
 */
export function Standing({
  stats,
  badges,
  badgeTotal,
}: {
  stats: DashboardStat[];
  badges: RecentBadge[];
  badgeTotal: number;
}): React.JSX.Element {
  return (
    <section className="dash-sec" aria-labelledby="dash-me-title">
      <div className="dash-sec-head">
        <h2 id="dash-me-title">Où tu en es</h2>
        <Link href="/profile" className="dash-sec-link">
          Voir le profil
        </Link>
      </div>
      <div className="dash-me">
        <div className="dash-figs">
          {stats.map((stat) => (
            <div key={stat.label} className="dash-fig">
              <b>
                {stat.value}
                {stat.unit !== null && <small>{stat.unit}</small>}
              </b>
              <span>
                {stat.label.toLowerCase()}
                <small>{stat.detail}</small>
              </span>
            </div>
          ))}
        </div>
        {badges.length > 0 && (
          <div className="dash-badges">
            {badges.map((row) => {
              const rarity = toBadgeRarity(row.badge.rarity);
              return (
                <div key={row.badge.name} className="dash-badge">
                  <BadgeMedallion
                    rarity={rarity}
                    size="sm"
                    iconUrl={row.badge.iconUrl}
                    name={row.badge.name}
                  />
                  <div>
                    <b>{row.badge.name}</b>
                    <span style={{ color: BADGE_RARITY_VAR[rarity] }}>
                      {BADGE_RARITY_LABELS[rarity]}
                    </span>
                  </div>
                </div>
              );
            })}
            <Link href="/badges" className="dash-badges-link">
              {badgeTotal} badge{badgeTotal > 1 ? "s" : ""}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
