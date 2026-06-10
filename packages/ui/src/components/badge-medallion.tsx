"use client";

import { useState, type CSSProperties } from "react";
import { cn } from "../lib/utils.js";
import type { BadgeRarity } from "./rarity-badge.js";
import { BADGE_RARITY_VAR } from "./badge-tokens.js";

export type BadgeMedallionSize = "xs" | "sm" | "md" | "lg";
export type BadgeMedallionState = "locked" | "unlocked";

/**
 * The single canonical hexagon — a REGULAR pointy-top hexagon drawn as an SVG
 * <polygon> (NOT a CSS clip-path + border). The viewBox carries the exact
 * √3/2 width:height ratio of a regular hexagon, so the shape can never
 * stretch, and the rarity outline is a real SVG stroke — uniform thickness on
 * all six edges. Pointy-top is kept: its two vertical edges stay parallel to
 * the card sides, and the badge artwork SVGs are pointy-top hexagons too.
 */
const HEX_VIEWBOX = "0 0 86.6 100";
const HEX_POINTS = "43.3,0 86.6,25 86.6,75 43.3,100 0,75 0,25";
/** width / height of a regular pointy-top hexagon (√3/2). */
const HEX_RATIO = 0.866;

const SIZES: Record<BadgeMedallionSize, { h: number; icon: number; ring: number }> = {
  xs: { h: 34, icon: 27, ring: 1.5 },
  sm: { h: 60, icon: 46, ring: 2 },
  md: { h: 110, icon: 86, ring: 3 },
  lg: { h: 142, icon: 110, ring: 3 },
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
 * The single shared hexagonal badge medallion. Replaces every per-page inline
 * hexagon + duplicated rarity colour map across the app (dashboard, /badges,
 * profile, public profile, lesson-complete modal, notifications).
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
  // Width derives from height at the regular-hexagon ratio — never stretched.
  const w = Math.round(s.h * HEX_RATIO * 10) / 10;
  const locked = state === "locked";
  const rarityColor = BADGE_RARITY_VAR[rarity];

  const glow = locked
    ? "drop-shadow(0 0 4px rgba(42,37,96,0.8))"
    : `drop-shadow(0 0 ${String(s.ring * 2)}px color-mix(in oklab, ${rarityColor} 70%, transparent)) drop-shadow(0 0 ${String(s.ring * 5)}px color-mix(in oklab, ${rarityColor} 26%, transparent))`;

  return (
    <div className={cn(className)} style={{ filter: glow, lineHeight: 0, ...style }}>
      <div
        style={{
          position: "relative",
          width: w,
          height: s.h,
          display: "grid",
          placeItems: "center",
        }}
      >
        {/* Plate + rarity outline: ONE polygon. vector-effect keeps the stroke
            at exactly `ring`px on all six edges at every rendered size. */}
        <svg
          viewBox={HEX_VIEWBOX}
          width={w}
          height={s.h}
          preserveAspectRatio="xMidYMid meet"
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
          aria-hidden="true"
        >
          <polygon
            points={HEX_POINTS}
            fill="#0a0826"
            stroke={locked ? "#2a2560" : rarityColor}
            strokeWidth={s.ring}
            strokeOpacity={locked ? 0.8 : 1}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {/* Icon */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "grid",
            placeItems: "center",
            filter: locked ? "none" : `drop-shadow(0 0 ${String(s.ring * 3)}px ${rarityColor})`,
          }}
        >
          <MedallionIcon
            iconUrl={iconUrl}
            name={name}
            size={s.icon}
            color={locked ? "#44406b" : rarityColor}
            dimmed={locked}
          />
        </div>
      </div>
    </div>
  );
}
