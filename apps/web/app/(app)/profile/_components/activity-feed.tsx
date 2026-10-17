import React from "react";
import Link from "next/link";

/** A lesson the reader completed, its date already written out. */
export interface SerializedLesson {
  lessonId: string;
  slug: string;
  title: string;
  category: string;
  xpReward: number;
  completedDateStr: string | null;
}

const CAT_COLOR: Record<string, string> = {
  CYBERSEC: "var(--color-category-cybersec)",
  DEV: "var(--color-rarity-rare)",
  NETWORK: "var(--color-brand-turquoise)",
};

/** The profile's Activité tab: the lessons completed, the latest first. */
export function ActivityFeed({ lessons }: { lessons: SerializedLesson[] }): React.ReactElement {
  if (lessons.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <p
          className="mono-label"
          style={{
            color: "var(--color-text-muted)",
          }}
        >
          {"// Aucune activité pour l'instant"}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {lessons.map((lp) => {
        const catColor = CAT_COLOR[lp.category] ?? "var(--color-text-muted)";
        return (
          <Link key={lp.lessonId} href={`/lessons/${lp.slug}`} style={{ textDecoration: "none" }}>
            <div
              className="card card--sunken"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "12px 16px",
              }}
            >
              <div
                style={{
                  width: 3,
                  height: 32,
                  background: catColor,
                  flexShrink: 0,
                  boxShadow: `0 0 8px color-mix(in srgb, ${catColor} 38%, transparent)`,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontWeight: 600,
                    fontSize: 13,
                    color: "var(--color-text-primary)",
                    margin: "0 0 2px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {lp.title}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--color-text-muted)",
                    margin: 0,
                  }}
                >
                  {lp.category.toLowerCase()}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 600,
                    fontSize: 12,
                    color: "var(--cosmetic-accent)",
                  }}
                >
                  +{lp.xpReward} XP
                </span>
                {lp.completedDateStr && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--color-text-muted)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {lp.completedDateStr}
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
