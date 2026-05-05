"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BadgeProgress {
  done: number;
  total: number;
  label: string;
}

export interface SerializedBadge {
  id: string;
  refCode: string;
  name: string;
  description: string;
  iconUrl: string;
  rarity: string;
  criterionType: string;
  earned: boolean;
  earnedDateStr: string | null;
  progress: BadgeProgress | null;
}

export interface BadgeGroup {
  rarity: string;
  label: string;
  badges: SerializedBadge[];
}

interface Props {
  groups: BadgeGroup[];
  earnedCount: number;
  totalCount: number;
  rarityTotals: Record<string, number>;
  rarityEarned: Record<string, number>;
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const HEX_CLIP = "polygon(50% 0, 100% 28%, 100% 72%, 50% 100%, 0 72%, 0 28%)";

const RARITY_META: Record<
  string,
  {
    color: string;
    borderColor: string;
    grad: string;
    glow: string;
    secColor: string;
    pillActiveBg: string;
    stripShadow: string;
  }
> = {
  LEGENDARY: {
    color: "#FFB547",
    borderColor: "rgba(255,181,71,0.35)",
    grad: "linear-gradient(135deg, #FFB547, #FF4757)",
    glow: "rgba(255,181,71,0.18)",
    secColor: "#FFB547",
    pillActiveBg: "rgba(255,181,71,0.08)",
    stripShadow: "0 0 12px rgba(255,181,71,0.6)",
  },
  EPIC: {
    color: "#0AFFD4",
    borderColor: "rgba(10,255,212,0.30)",
    grad: "linear-gradient(135deg, #0AFFD4, #0024FF)",
    glow: "rgba(10,255,212,0.18)",
    secColor: "#0AFFD4",
    pillActiveBg: "rgba(10,255,212,0.08)",
    stripShadow: "0 0 12px rgba(10,255,212,0.6)",
  },
  RARE: {
    color: "#6E8BFF",
    borderColor: "rgba(110,139,255,0.28)",
    grad: "linear-gradient(135deg, #6E8BFF, #4A3FCC)",
    glow: "rgba(110,139,255,0.18)",
    secColor: "#6E8BFF",
    pillActiveBg: "rgba(110,139,255,0.08)",
    stripShadow: "0 0 12px rgba(110,139,255,0.5)",
  },
  COMMON: {
    color: "#B8B5D1",
    borderColor: "#2A2560",
    grad: "linear-gradient(135deg, #B8B5D1, #6F6B99)",
    glow: "rgba(184,181,209,0.10)",
    secColor: "#B8B5D1",
    pillActiveBg: "rgba(184,181,209,0.06)",
    stripShadow: "0 0 8px rgba(184,181,209,0.4)",
  },
};

const RARITY_PILL_COLOR: Record<string, string> = {
  all: "#B8B5D1",
  legendary: "#FFB547",
  epic: "#0AFFD4",
  rare: "#6E8BFF",
  common: "#B8B5D1",
};

// ── Criterion type → glyph name mapping ──────────────────────────────────────

const CRITERION_GLYPH: Record<string, string> = {
  LESSON_COMPLETED: "book",
  STREAK_DAYS: "flame",
  XP_THRESHOLD: "bolt",
  PATH_COMPLETED: "layers",
  CATEGORY_MASTERY: "radar",
  PERFECT_QUIZ: "flag",
};

// ── Glyph SVGs (40×40 viewBox, stroke-based — matches design exactly) ─────────

function BadgeGlyph({
  criterionType,
  size = 36,
  color = "currentColor",
}: { criterionType: string; size?: number; color?: string }) {
  const name = CRITERION_GLYPH[criterionType] ?? "flag";
  const s = {
    width: size,
    height: size,
    fill: "none",
    stroke: color,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "drop":
      return (
        <svg viewBox="0 0 40 40" {...s} aria-hidden="true">
          <path
            d="M20 4 C20 13 28 16 28 24 C28 28 24.5 32 20 32 C15.5 32 12 28 12 24 C12 16 20 13 20 4 Z"
            fill={color}
            fillOpacity="0.25"
          />
        </svg>
      );
    case "skull":
      return (
        <svg viewBox="0 0 40 40" {...s} aria-hidden="true">
          <path
            d="M10 18 C10 11 14 6 20 6 C26 6 30 11 30 18 V24 L27 27 V32 H23 V28 H17 V32 H13 V27 L10 24 Z"
            fill={color}
            fillOpacity="0.2"
          />
          <circle cx="16" cy="20" r="2" fill={color} />
          <circle cx="24" cy="20" r="2" fill={color} />
          <path d="M19 26 L20 28 L21 26" />
        </svg>
      );
    case "crown":
      return (
        <svg viewBox="0 0 40 40" {...s} aria-hidden="true">
          <path d="M6 14 L10 26 H30 L34 14 L27 19 L20 8 L13 19 Z" fill={color} fillOpacity="0.22" />
          <path d="M10 30 H30" />
        </svg>
      );
    case "flame":
      return (
        <svg viewBox="0 0 40 40" {...s} aria-hidden="true">
          <path
            d="M20 4 C20 11 15 13 15 20 C15 22 16 23 17.5 23 C16 25 15 27 15 29 C15 33 18 36 21 36 C25 36 28 33 28 28 C28 22 22 20 22 14 C22 11 21 7 20 4 Z"
            fill={color}
            fillOpacity="0.25"
          />
        </svg>
      );
    case "radar":
      return (
        <svg viewBox="0 0 40 40" {...s} aria-hidden="true">
          <circle cx="20" cy="20" r="14" />
          <circle cx="20" cy="20" r="8" />
          <circle cx="20" cy="20" r="2" fill={color} />
          <path d="M20 20 L32 12" />
        </svg>
      );
    case "bolt":
      return (
        <svg viewBox="0 0 40 40" {...s} aria-hidden="true">
          <path d="M22 4 L10 22 H19 L17 36 L30 18 H21 Z" fill={color} fillOpacity="0.22" />
        </svg>
      );
    case "db":
      return (
        <svg viewBox="0 0 40 40" {...s} aria-hidden="true">
          <ellipse cx="20" cy="10" rx="12" ry="4" />
          <path d="M8 10 V22 C8 25 13 27 20 27 C27 27 32 25 32 22 V10" />
          <path d="M8 22 V32 C8 35 13 37 20 37 C27 37 32 35 32 32 V22" />
        </svg>
      );
    case "bug":
      return (
        <svg viewBox="0 0 40 40" {...s} aria-hidden="true">
          <rect x="12" y="14" width="16" height="18" rx="6" />
          <path d="M14 22 H8 M26 22 H32 M14 16 L9 12 M26 16 L31 12 M14 30 L9 34 M26 30 L31 34" />
          <path d="M16 10 C16 7 18 6 20 6 C22 6 24 7 24 10" />
        </svg>
      );
    case "stack":
      return (
        <svg viewBox="0 0 40 40" {...s} aria-hidden="true">
          <rect x="8" y="10" width="24" height="6" />
          <rect x="8" y="20" width="24" height="6" />
          <rect x="8" y="30" width="24" height="6" />
          <path d="M14 13 H18 M14 23 H18 M14 33 H18" />
        </svg>
      );
    case "lock":
      return (
        <svg viewBox="0 0 40 40" {...s} aria-hidden="true">
          <rect x="10" y="18" width="20" height="16" rx="2" />
          <path d="M14 18 V12 C14 8.5 16.5 6 20 6 C23.5 6 26 8.5 26 12 V18" />
          <circle cx="20" cy="26" r="2" fill={color} />
        </svg>
      );
    case "flag":
      return (
        <svg viewBox="0 0 40 40" {...s} aria-hidden="true">
          <path d="M10 6 V36" />
          <path d="M10 8 H30 L26 14 L30 20 H10 Z" fill={color} fillOpacity="0.25" />
        </svg>
      );
    case "layers":
      return (
        <svg viewBox="0 0 40 40" {...s} aria-hidden="true">
          <path d="M20 6 L34 13 L20 20 L6 13 Z" />
          <path d="M6 20 L20 27 L34 20" />
          <path d="M6 27 L20 34 L34 27" />
        </svg>
      );
    case "user":
      return (
        <svg viewBox="0 0 40 40" {...s} aria-hidden="true">
          <circle cx="20" cy="14" r="6" />
          <path d="M8 34 C8 27 13 23 20 23 C27 23 32 27 32 34" />
        </svg>
      );
    case "book":
      return (
        <svg viewBox="0 0 40 40" {...s} aria-hidden="true">
          <path d="M8 8 H18 C20 8 21 9 21 11 V34 C21 32 20 31 18 31 H8 Z" />
          <path d="M32 8 H22 C20 8 19 9 19 11 V34 C19 32 20 31 22 31 H32 Z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 40 40" {...s} aria-hidden="true">
          <path d="M10 6 V36" />
          <path d="M10 8 H30 L26 14 L30 20 H10 Z" fill={color} fillOpacity="0.25" />
        </svg>
      );
  }
}

function BadgeImageWithFallback({
  src,
  alt,
  width,
  height,
  criterionType,
  color,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  criterionType: string;
  color: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <BadgeGlyph criterionType={criterionType} size={width} color={color} />;
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      style={{ objectFit: "contain" }}
      onError={() => {
        setFailed(true);
      }}
    />
  );
}

// ── Check / Lock icons ────────────────────────────────────────────────────────

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

// ── Badge card ────────────────────────────────────────────────────────────────

function BadgeCard({ badge }: { badge: SerializedBadge }) {
  const [hovered, setHovered] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const r = RARITY_META[badge.rarity] ?? RARITY_META.COMMON!;
  const isLeg = badge.rarity === "LEGENDARY";
  const hexW = isLeg ? 132 : 96;
  const hexH = isLeg ? 152 : 110;
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
      {/* Bottom atmospheric glow — simulates bcard::before radial gradient */}
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
        style={{
          position: "absolute",
          top: 10,
          left: 12,
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#6F6B99",
        }}
      >
        {"// "}
        <b style={{ color: badge.earned ? r.color : "#44406B" }}>{badge.refCode}</b>
      </div>

      {/* Lock icon (unearned) */}
      {!badge.earned && (
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 24,
            height: 24,
            display: "grid",
            placeItems: "center",
            background: "#05041A",
            border: "1px solid #2A2560",
            color: "#6F6B99",
            zIndex: 2,
          }}
        >
          <LockIcon />
        </div>
      )}

      {/* Hexagonal medallion — outer wrapper carries drop-shadow so it shows outside clip-path */}
      <div
        style={{
          margin: isLeg ? "10px 0 22px" : "8px 0 18px",
          filter: badge.earned
            ? `drop-shadow(0 0 6px ${r.color}) drop-shadow(0 0 14px ${r.glow})`
            : "drop-shadow(0 0 4px rgba(42,37,96,0.8))",
        }}
        aria-hidden="true"
      >
        <div
          style={{
            position: "relative",
            width: hexW,
            height: hexH,
            display: "grid",
            placeItems: "center",
            clipPath: HEX_CLIP,
          }}
        >
          {/* Gradient ring — fills full hex */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: badge.earned ? r.grad : "linear-gradient(135deg, #2A2560, #1A1640)",
              opacity: badge.earned ? 1 : 0.7,
            }}
          />
          {/* Inner dark fill — creates the ring gap */}
          <div
            style={{
              position: "absolute",
              top: 3,
              left: 3,
              right: 3,
              bottom: 3,
              background: "#0A0826",
              clipPath: HEX_CLIP,
            }}
          />
          {/* Badge icon */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              filter: badge.earned ? `drop-shadow(0 0 10px ${r.color})` : "none",
              opacity: badge.earned ? 1 : 0.55,
            }}
          >
            <BadgeImageWithFallback
              src={badge.iconUrl}
              alt={badge.name}
              width={isLeg ? 52 : 36}
              height={isLeg ? 52 : 36}
              criterionType={badge.criterionType}
              color={badge.earned ? r.color : "#44406B"}
            />
          </div>
        </div>
      </div>

      {/* Rarity label */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          fontSize: 9.5,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: badge.earned ? r.color : "#44406B",
          marginBottom: 8,
        }}
      >
        ·{" "}
        {badge.rarity === "LEGENDARY"
          ? "Légendaire"
          : badge.rarity === "EPIC"
            ? "Épique"
            : badge.rarity === "RARE"
              ? "Rare"
              : "Commun"}{" "}
        ·
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
          color: badge.earned ? "#B8B5D1" : "#6F6B99",
          margin: "0 0 16px",
          maxWidth: isLeg ? 320 : 260,
        }}
      >
        {badge.earned ? badge.description : badge.description}
      </p>

      {/* Footer: earned date or progress */}
      {badge.earned ? (
        <div
          style={{
            marginTop: "auto",
            width: "100%",
            paddingTop: 14,
            borderTop: "1px solid #1A1640",
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#6F6B99",
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
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#6F6B99",
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
          <div
            style={{
              position: "relative",
              height: 3,
              background: "#05041A",
              borderTop: "1px solid #2A2560",
              borderBottom: "1px solid #2A2560",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${String(pct)}%`,
                background: r.grad,
                boxShadow: `0 0 8px ${r.color}`,
              }}
            />
          </div>
        </div>
      ) : (
        <div
          style={{
            marginTop: "auto",
            width: "100%",
            paddingTop: 14,
            borderTop: "1px solid #1A1640",
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
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

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  rarity,
  label,
  earned,
  total,
}: {
  rarity: string;
  label: string;
  earned: number;
  total: number;
}) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const meta = RARITY_META[rarity] ?? RARITY_META.COMMON!;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        marginBottom: 22,
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        color: meta.secColor,
      }}
    >
      {/* Left fade rule */}
      <span
        style={{
          maxWidth: 60,
          flex: "0 0 60px",
          height: 1,
          background: `linear-gradient(90deg, transparent, ${meta.secColor})`,
        }}
      />
      <span>── {label} ──</span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          fontSize: 11,
          color: "#6F6B99",
          letterSpacing: "0.14em",
        }}
      >
        <b style={{ color: meta.secColor }}>{earned}</b> / {total} obtenus
      </span>
      {/* Right fade rule */}
      <span
        style={{
          flex: 1,
          height: 1,
          background: `linear-gradient(90deg, ${meta.secColor}, transparent)`,
        }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BadgesCollection({
  groups,
  earnedCount,
  totalCount,
  rarityTotals,
  rarityEarned,
}: Props): React.JSX.Element {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const pct = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;

  const visibleGroups = useMemo(() => {
    return groups
      .filter((g) => activeFilter === "all" || g.rarity.toLowerCase() === activeFilter)
      .map((g) => ({
        ...g,
        badges: search.trim()
          ? g.badges.filter(
              (b) =>
                b.name.toLowerCase().includes(search.toLowerCase()) ||
                b.description.toLowerCase().includes(search.toLowerCase()),
            )
          : g.badges,
      }))
      .filter((g) => g.badges.length > 0);
  }, [groups, activeFilter, search]);

  const pills = [
    { id: "all", label: "Tous", count: totalCount },
    { id: "legendary", label: "Légendaire", count: rarityTotals.LEGENDARY ?? 0 },
    { id: "epic", label: "Épique", count: rarityTotals.EPIC ?? 0 },
    { id: "rare", label: "Rare", count: rarityTotals.RARE ?? 0 },
    { id: "common", label: "Commun", count: rarityTotals.COMMON ?? 0 },
  ];

  return (
    <div className="page-container">
      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          letterSpacing: "0.04em",
          color: "#6F6B99",
          marginBottom: 26,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ color: "#0AFFD4" }}>$</span>
        <span>~/</span>
        <b style={{ color: "#B8B5D1", fontWeight: 500 }}>cyberlearn</b>
        <span style={{ color: "#44406B" }}>/</span>
        <span style={{ color: "#F5F5FA", fontWeight: 500 }}>badges</span>
        <span
          style={{
            display: "inline-block",
            width: 7,
            height: 13,
            background: "#0AFFD4",
            boxShadow: "0 0 8px #0AFFD4",
            marginLeft: 4,
            verticalAlign: "-2px",
            animation: "blink 1s step-end infinite",
          }}
          aria-hidden="true"
        />
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="catalog-header-grid">
        <div>
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: "clamp(44px, 5.4vw, 76px)",
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              color: "#F5F5FA",
              margin: "0 0 14px",
            }}
          >
            Ton{" "}
            <em
              style={{
                fontStyle: "normal",
                background: "linear-gradient(135deg, #0024FF 0%, #0AFFD4 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              arsenal
            </em>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                fontSize: "0.42em",
                letterSpacing: "0.04em",
                color: "#6F6B99",
                verticalAlign: "0.25em",
                marginLeft: 14,
              }}
            >
              <b style={{ color: "#0AFFD4", fontWeight: 700 }}>{earnedCount}</b> / {totalCount}
            </span>
          </h1>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 15,
              color: "#B8B5D1",
              margin: 0,
              maxWidth: 520,
              lineHeight: 1.55,
            }}
          >
            Badges groupés par rareté. Continue à grinder pour débloquer le reste, chaque palier
            raconte une compétence.
          </p>
        </div>

        <div
          style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}
        >
          {/* Rarity breakdown */}
          <div
            style={{
              display: "flex",
              gap: 18,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#6F6B99",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              flexWrap: "wrap",
            }}
          >
            <span>
              <b style={{ color: "#FFB547" }}>{rarityEarned.LEGENDARY ?? 0}</b> légendaire
            </span>
            <span style={{ color: "#44406B" }}>/</span>
            <span>
              <b style={{ color: "#0AFFD4" }}>{rarityEarned.EPIC ?? 0}</b> épiques
            </span>
            <span style={{ color: "#44406B" }}>/</span>
            <span>
              <b style={{ color: "#6E8BFF" }}>{rarityEarned.RARE ?? 0}</b> rares
            </span>
            <span style={{ color: "#44406B" }}>/</span>
            <span>
              <b style={{ color: "#B8B5D1" }}>{rarityEarned.COMMON ?? 0}</b> communs
            </span>
          </div>

          {/* Global progress bar */}
          <div
            style={{
              position: "relative",
              height: 6,
              background: "#05041A",
              border: "1px solid #2A2560",
              width: 320,
              overflow: "visible",
            }}
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              style={{
                height: "100%",
                width: `${pct.toFixed(1)}%`,
                background: "linear-gradient(90deg, #0024FF, #0AFFD4)",
                boxShadow: "0 0 10px rgba(10,255,212,0.5)",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  right: -1,
                  top: -3,
                  bottom: -3,
                  width: 2,
                  background: "#0AFFD4",
                  boxShadow: "0 0 10px #0AFFD4",
                }}
                aria-hidden="true"
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 14,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#6F6B99",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <span>
              PROGRESSION · <b style={{ color: "#F5F5FA" }}>{Math.round(pct)}%</b>
            </span>
          </div>
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div
        suppressHydrationWarning
        style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#6F6B99",
            marginRight: 6,
          }}
        >
          › RARETÉ
        </span>

        {pills.map((pill) => {
          const isActive = activeFilter === pill.id;
          const dotColor = RARITY_PILL_COLOR[pill.id] ?? "#B8B5D1";
          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => {
                setActiveFilter(pill.id);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                height: 34,
                padding: "0 16px",
                background: isActive
                  ? `color-mix(in oklab, ${dotColor} 6%, transparent)`
                  : "transparent",
                border: `1px solid ${isActive ? dotColor : "#2A2560"}`,
                color: isActive ? dotColor : "#B8B5D1",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                cursor: "pointer",
                borderRadius: 0,
                boxShadow: isActive ? `0 0 0 1px ${dotColor}40, 0 0 18px ${dotColor}30` : "none",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  background: dotColor,
                  transform: "rotate(45deg)",
                  boxShadow: isActive ? `0 0 6px ${dotColor}` : "none",
                }}
              />
              <span>{pill.label}</span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  padding: "1px 6px",
                  border: `1px solid ${isActive ? `${dotColor}60` : "#2A2560"}`,
                  letterSpacing: "0.04em",
                  color: isActive ? dotColor : "#6F6B99",
                }}
              >
                {pill.count}
              </span>
            </button>
          );
        })}

        {/* Search input */}
        <label
          style={{
            marginLeft: "auto",
            position: "relative",
            height: 34,
            minWidth: 220,
            display: "block",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#6F6B99",
              pointerEvents: "none",
            }}
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11 L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            placeholder="/ chercher un badge..."
            style={{
              width: "100%",
              height: "100%",
              padding: "0 12px 0 36px",
              background: "#05041A",
              border: "1px solid #2A2560",
              color: "#F5F5FA",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              outline: "none",
              borderRadius: 0,
            }}
          />
        </label>
      </div>

      {/* ── Badge sections ─────────────────────────────────────────────────── */}
      {visibleGroups.map((group) => {
        const earnedInGroup = group.badges.filter((b) => b.earned).length;
        return (
          <section key={group.rarity} style={{ marginTop: 56 }}>
            <SectionHeader
              rarity={group.rarity}
              label={group.label}
              earned={earnedInGroup}
              total={group.badges.length}
            />
            <div className="grid-3-col">
              {group.badges.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Empty state when search returns nothing */}
      {visibleGroups.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#6F6B99" }}>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {"// Aucun badge trouvé"}
          </p>
        </div>
      )}
    </div>
  );
}
