"use client";

import { useState, type CSSProperties } from "react";
import { cn } from "../lib/utils.js";
import type { BadgeRarity } from "./rarity-badge.js";
import { BADGE_RARITY_VAR } from "./badge-tokens.js";

export type BadgeMedallionSize = "xs" | "sm" | "md" | "lg";
export type BadgeMedallionState = "locked" | "unlocked";

/** The single canonical hexagon geometry — shared by EVERY badge medallion. */
const HEX_CLIP = "polygon(50% 0, 100% 28%, 100% 72%, 50% 100%, 0 72%, 0 28%)";

const SIZES: Record<BadgeMedallionSize, { w: number; h: number; icon: number; ring: number }> = {
  xs: { w: 30, h: 34, icon: 27, ring: 1.5 },
  sm: { w: 52, h: 60, icon: 46, ring: 2 },
  md: { w: 96, h: 110, icon: 86, ring: 3 },
  lg: { w: 124, h: 142, icon: 110, ring: 3 },
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
  const locked = state === "locked";
  const rarityColor = BADGE_RARITY_VAR[rarity];
  const ringPx = `${String(s.ring)}px`;

  const ringBg = locked
    ? "linear-gradient(145deg, #2a2560, #1a1640)"
    : `linear-gradient(145deg, ${rarityColor}, color-mix(in oklab, ${rarityColor} 38%, #05041a))`;

  const glow = locked
    ? "drop-shadow(0 0 4px rgba(42,37,96,0.8))"
    : `drop-shadow(0 0 ${String(s.ring * 2)}px color-mix(in oklab, ${rarityColor} 70%, transparent)) drop-shadow(0 0 ${String(s.ring * 5)}px color-mix(in oklab, ${rarityColor} 26%, transparent))`;

  return (
    <div className={cn(className)} style={{ filter: glow, lineHeight: 0, ...style }}>
      <div
        style={{
          position: "relative",
          width: s.w,
          height: s.h,
          display: "grid",
          placeItems: "center",
          clipPath: HEX_CLIP,
        }}
      >
        {/* Rarity ring */}
        <div
          style={{ position: "absolute", inset: 0, background: ringBg, opacity: locked ? 0.7 : 1 }}
          aria-hidden="true"
        />
        {/* Inner dark fill — creates the ring gap */}
        <div
          style={{ position: "absolute", inset: ringPx, background: "#0a0826", clipPath: HEX_CLIP }}
          aria-hidden="true"
        />
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
