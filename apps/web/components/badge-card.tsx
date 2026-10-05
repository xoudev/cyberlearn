"use client";

// "use client" justification: the card lifts on hover.

import React, { useState } from "react";
import {
  BadgeMedallion,
  BADGE_RARITY_LABELS,
  BADGE_RARITY_VAR,
  toBadgeRarity,
} from "@cyberlearn/ui";
import type { SerializedBadge } from "@/lib/badges/collection";
import { ProgressBar } from "@/components/progress-bar";

/**
 * A badge, earned or still to earn: the medallion, its rarity, its name and
 * either the day it was earned or how far along it is. The badges page and
 * the profile each drew their own; this is the badges page's, which knew
 * about both states, and the profile shows its earned ones with it.
 */

/** The colours a rarity gives a card, from the one scale in tokens.css. */
export function rarityChrome(rarity: string): {
  color: string;
  borderColor: string;
  grad: string;
  glow: string;
  secColor: string;
  stripShadow: string;
} {
  const v = BADGE_RARITY_VAR[toBadgeRarity(rarity)];
  return {
    color: v,
    borderColor: `color-mix(in oklab, ${v} 30%, #1f1b47)`,
    grad: `linear-gradient(135deg, ${v}, color-mix(in oklab, ${v} 50%, #05041a))`,
    glow: `color-mix(in oklab, ${v} 16%, transparent)`,
    secColor: v,
    stripShadow: `0 0 12px color-mix(in oklab, ${v} 55%, transparent)`,
  };
}

function CheckIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8 L7 12 L13 4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="7" width="10" height="7" rx="1" />
      <path d="M5 7 V5 C5 3.3 6.3 2 8 2 C9.7 2 11 3.3 11 5 V7" />
    </svg>
  );
}

export function BadgeCard({ badge }: { badge: SerializedBadge }): React.JSX.Element {
  const [hovered, setHovered] = useState(false);
  const r = rarityChrome(badge.rarity);
  const isLeg = badge.rarity === "LEGENDARY";
  const pct = badge.progress ? Math.round((badge.progress.done / badge.progress.total) * 100) : 0;

  return (
    <article
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
      style={{
        position: "relative",
        padding: isLeg ? "32px 24px 26px" : "26px 20px 22px",
        background: badge.earned ? "rgba(10,8,38,0.5)" : "rgba(7,5,32,0.4)",
        border: `1px solid ${
          badge.earned ? (hovered ? "#2A2560" : r.borderColor) : hovered ? "#2A2560" : "#1F1B47"
        }`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        overflow: "hidden",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        transition: "transform 280ms cubic-bezier(0.16,1,0.3,1), border-color 180ms ease",
      }}
    >
      {/* Bottom atmospheric glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: badge.earned
            ? `radial-gradient(ellipse 80% 60% at 50% 100%, ${r.glow}, transparent 70%)`
            : "none",
          opacity: 0.55,
        }}
        aria-hidden="true"
      />

      {/* Rarity strip */}
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: badge.earned
            ? `linear-gradient(90deg, transparent, ${r.color}, transparent)`
            : "linear-gradient(90deg, transparent, #44406B, transparent)",
          boxShadow: badge.earned ? r.stripShadow : "none",
        }}
        aria-hidden="true"
      />

      {/* Legendary corner brackets */}
      {isLeg && (
        <>
          <span
            style={{
              position: "absolute",
              top: -1,
              left: -1,
              width: 12,
              height: 12,
              borderTop: `2px solid ${r.color}`,
              borderLeft: `2px solid ${r.color}`,
              opacity: 0.7,
            }}
          />
          <span
            style={{
              position: "absolute",
              top: -1,
              right: -1,
              width: 12,
              height: 12,
              borderTop: `2px solid ${r.color}`,
              borderRight: `2px solid ${r.color}`,
              opacity: 0.7,
            }}
          />
          <span
            style={{
              position: "absolute",
              bottom: -1,
              left: -1,
              width: 12,
              height: 12,
              borderBottom: `2px solid ${r.color}`,
              borderLeft: `2px solid ${r.color}`,
              opacity: 0.7,
            }}
          />
          <span
            style={{
              position: "absolute",
              bottom: -1,
              right: -1,
              width: 12,
              height: 12,
              borderBottom: `2px solid ${r.color}`,
              borderRight: `2px solid ${r.color}`,
              opacity: 0.7,
            }}
          />
        </>
      )}

      {/* RefCode label */}
      <div
        className="mono-label mono-label--xs"
        style={{
          position: "absolute",
          top: 10,
          left: 12,
          color: "#7F7BA9",
        }}
      >
        {"// "}
        <b style={{ color: badge.earned ? r.color : "#44406B" }}>{badge.refCode}</b>
      </div>

      {/* Lock icon (unearned) */}
      {!badge.earned && (
        <div
          className="card"
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 24,
            height: 24,
            display: "grid",
            placeItems: "center",
            color: "#7F7BA9",
            zIndex: 2,
          }}
        >
          <LockIcon />
        </div>
      )}

      {/* Hexagonal medallion: shared component */}
      <BadgeMedallion
        rarity={toBadgeRarity(badge.rarity)}
        size={isLeg ? "lg" : "md"}
        state={badge.earned ? "unlocked" : "locked"}
        iconUrl={badge.iconUrl}
        name={badge.name}
        style={{ margin: isLeg ? "10px 0 22px" : "8px 0 18px" }}
      />

      {/* Rarity label */}
      <div
        className="mono-label mono-label--xs"
        style={{
          fontWeight: 700,
          color: badge.earned ? r.color : "#44406B",
          marginBottom: 8,
        }}
      >
        · {BADGE_RARITY_LABELS[toBadgeRarity(badge.rarity)]} ·
      </div>

      {/* Name */}
      <h3
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 700,
          fontSize: isLeg ? 22 : 17,
          lineHeight: 1.15,
          color: badge.earned ? "#F5F5FA" : "#B8B5D1",
          margin: "0 0 8px",
          letterSpacing: "-0.01em",
        }}
      >
        {badge.name}
      </h3>

      {/* Description */}
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: isLeg ? 13 : 12.5,
          lineHeight: 1.5,
          color: badge.earned ? "#B8B5D1" : "#7F7BA9",
          margin: "0 0 16px",
          maxWidth: isLeg ? 320 : 260,
        }}
      >
        {badge.description}
      </p>

      {/* Footer: earned date or progress */}
      {badge.earned ? (
        <div
          className="mono-label"
          style={{
            marginTop: "auto",
            width: "100%",
            paddingTop: 14,
            borderTop: "1px solid #1A1640",
            color: "#7F7BA9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              display: "inline-grid",
              placeItems: "center",
              width: 14,
              height: 14,
              color: r.color,
            }}
          >
            <CheckIcon />
          </span>
          Obtenu le <b style={{ color: r.color, fontWeight: 700 }}>{badge.earnedDateStr}</b>
        </div>
      ) : badge.progress ? (
        <div
          style={{
            width: "100%",
            marginTop: "auto",
            paddingTop: 14,
            borderTop: "1px solid #1A1640",
          }}
        >
          <div
            className="mono-label"
            style={{
              display: "flex",
              justifyContent: "space-between",
              color: "#7F7BA9",
              marginBottom: 6,
            }}
          >
            <span>
              <b style={{ color: "#F5F5FA", fontWeight: 700 }}>
                {badge.progress.done}/{badge.progress.total}
              </b>{" "}
              {badge.progress.label}
            </span>
            <span style={{ color: r.color, fontWeight: 700 }}>{pct}%</span>
          </div>
          <ProgressBar value={pct} size="xs" color={r.color} label={badge.progress.label} />
        </div>
      ) : (
        <div
          className="mono-label"
          style={{
            marginTop: "auto",
            width: "100%",
            paddingTop: 14,
            borderTop: "1px solid #1A1640",
            color: "#44406B",
            textAlign: "center",
          }}
        >
          {"// verrouillé"}
        </div>
      )}
    </article>
  );
}
