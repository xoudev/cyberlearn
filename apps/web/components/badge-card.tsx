import React from "react";
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
 *
 * Bastion: a matt panel with the rarity as a flat line along its top. The
 * glow, the gradient strip, the corner brackets and the lift on hover were
 * the old art direction's, and are gone.
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
    borderColor: "#303137",
    grad: `linear-gradient(${v}, ${v})`,
    glow: "transparent",
    secColor: v,
    stripShadow: "none",
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
  const r = rarityChrome(badge.rarity);
  const isLeg = badge.rarity === "LEGENDARY";
  const pct = badge.progress ? Math.round((badge.progress.done / badge.progress.total) * 100) : 0;

  return (
    <article
      className="badge-card"
      style={{
        position: "relative",
        padding: isLeg ? "32px 24px 26px" : "26px 20px 22px",
        background: "#121418",
        border: "1px solid #303137",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      {/* Rarity line: flat, in the rarity's colour once earned */}
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: badge.earned ? r.color : "#303137",
        }}
        aria-hidden="true"
      />

      {/* Reference: data, in the monospace */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 12,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "#aaa79f",
        }}
      >
        {badge.refCode}
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
            color: "#aaa79f",
            zIndex: 2,
          }}
        >
          <LockIcon />
        </div>
      )}

      {/* Medallion: shared component */}
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
        className="mono-label"
        style={{
          color: badge.earned ? r.color : "#aaa79f",
          marginBottom: 8,
        }}
      >
        {BADGE_RARITY_LABELS[toBadgeRarity(badge.rarity)]}
      </div>

      {/* Name */}
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: isLeg ? 32 : 28,
          lineHeight: 1.05,
          color: badge.earned ? "#f4f2ed" : "#c2bfb8",
          margin: "0 0 8px",
        }}
      >
        {badge.name}
      </h3>

      {/* Description */}
      <p
        style={{
          fontFamily: "var(--font-interface)",
          fontSize: 13,
          lineHeight: 1.6,
          color: badge.earned ? "#c2bfb8" : "#aaa79f",
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
            borderTop: "1px solid #303137",
            color: "#aaa79f",
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
          Obtenu le <b style={{ color: "#f4f2ed", fontWeight: 700 }}>{badge.earnedDateStr}</b>
        </div>
      ) : badge.progress ? (
        <div
          style={{
            width: "100%",
            marginTop: "auto",
            paddingTop: 14,
            borderTop: "1px solid #303137",
          }}
        >
          <div
            className="mono-label"
            style={{
              display: "flex",
              justifyContent: "space-between",
              color: "#aaa79f",
              marginBottom: 6,
            }}
          >
            <span>
              <b style={{ color: "#f4f2ed", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                {badge.progress.done}/{badge.progress.total}
              </b>{" "}
              {badge.progress.label}
            </span>
            <span style={{ color: "#f4f2ed", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
              {pct}%
            </span>
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
            borderTop: "1px solid #303137",
            color: "#aaa79f",
            textAlign: "center",
          }}
        >
          Verrouillé
        </div>
      )}
    </article>
  );
}
