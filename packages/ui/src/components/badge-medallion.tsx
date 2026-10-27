"use client";

import { useState, type CSSProperties } from "react";
import { cn } from "../lib/utils.js";
import type { BadgeRarity } from "./badge-tokens.js";
import { BADGE_RARITY_VAR } from "./badge-tokens.js";

export type BadgeMedallionSize = "xs" | "sm" | "md" | "lg";
export type BadgeMedallionState = "locked" | "unlocked";

/**
 * The plate is a square, the Bastion way: a matt panel with the rarity drawn
 * as its frame. It used to be a pointy-top hexagon with a neon halo, the
 * vocabulary of the old art direction; the rarity colour keeps its meaning,
 * it just stops glowing. The frame is a real border of `ring` px, uniform on
 * the four sides at every size.
 */
const SIZES: Record<BadgeMedallionSize, { h: number; icon: number; ring: number }> = {
  xs: { h: 34, icon: 24, ring: 1.5 },
  sm: { h: 60, icon: 42, ring: 2 },
  md: { h: 110, icon: 78, ring: 3 },
  lg: { h: 142, icon: 100, ring: 3 },
};

/** The single consistent fallback glyph (an award star), used everywhere the
 *  badge has no iconUrl or the image fails to load. */
function FallbackGlyph({ size, color }: { size: number; color: string }): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path
        d="M20 5 L24.6 15.2 L35.5 16.2 L27.3 23.6 L29.8 34.2 L20 28.6 L10.2 34.2 L12.7 23.6 L4.5 16.2 L15.4 15.2 Z"
        fill={color}
        fillOpacity="0.18"
      />
    </svg>
  );
}

function MedallionIcon({
  iconUrl,
  name,
  size,
  color,
  dimmed,
}: {
  iconUrl: string | null | undefined;
  name: string | undefined;
  size: number;
  color: string;
  dimmed: boolean;
}): React.ReactElement {
  const [failed, setFailed] = useState(false);
  if (!iconUrl || failed) {
    return <FallbackGlyph size={size} color={color} />;
  }
  return (
    // Plain <img>: this is a shared, framework-agnostic library component, and
    // the icons are tiny inline SVGs that gain nothing from next/image.
    <img
      src={iconUrl}
      alt={name ?? ""}
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain", opacity: dimmed ? 0.55 : 1 }}
      onError={() => {
        setFailed(true);
      }}
    />
  );
}

export interface BadgeMedallionProps {
  rarity: BadgeRarity;
  /** Medallion size. Defaults to "md". */
  size?: BadgeMedallionSize;
  /** "locked" dims the ring + icon (use only on the /badges collection). Defaults to "unlocked". */
  state?: BadgeMedallionState;
  /** Real badge icon. Falls back to a single shared glyph when absent or broken. */
  iconUrl?: string | null;
  /** Accessible name (alt text) for the icon image. */
  name?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * The single shared badge medallion. Replaces every per-page inline plate and
 * duplicated rarity colour map across the app (dashboard, /badges, profile,
 * public profile, lesson-complete modal, notifications).
 */
export function BadgeMedallion({
  rarity,
  size = "md",
  state = "unlocked",
  iconUrl,
  name,
  className,
  style,
}: BadgeMedallionProps): React.ReactElement {
  const s = SIZES[size];
  const locked = state === "locked";
  const rarityColor = BADGE_RARITY_VAR[rarity];

  return (
    <div className={cn(className)} style={{ lineHeight: 0, ...style }}>
      <div
        style={{
          boxSizing: "border-box",
          width: s.h,
          height: s.h,
          display: "grid",
          placeItems: "center",
          background: "#121418",
          border: `${String(s.ring)}px solid ${locked ? "var(--color-interface-separator, #303137)" : rarityColor}`,
          borderRadius: 0,
        }}
      >
        <MedallionIcon
          iconUrl={iconUrl}
          name={name}
          size={s.icon}
          color={locked ? "var(--color-text-faint)" : rarityColor}
          dimmed={locked}
        />
      </div>
    </div>
  );
}
