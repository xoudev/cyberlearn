"use client";

import type { ReactNode, CSSProperties } from "react";
import React from "react";

export type LessonDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
export type LessonStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type LessonCategory = "CYBERSEC" | "DEV" | "NETWORK";

// ── Design tokens - per CatalogGrid.jsx / catalog.css reference ───────────────

const CAT_META = {
  DEV: {
    label: "DEV",
    accent: "#6E8BFF",
    glow: "rgba(0,36,255,0.28)",
    tagColor: "#6E8BFF",
    tagBg: "rgba(0,36,255,0.1)",
    tagBorder: "rgba(110,139,255,0.45)",
  },
  CYBERSEC: {
    label: "CYBERSEC",
    accent: "#FF4757",
    glow: "rgba(255,71,87,0.22)",
    tagColor: "#FF4757",
    tagBg: "rgba(255,71,87,0.08)",
    tagBorder: "rgba(255,71,87,0.4)",
  },
  NETWORK: {
    label: "RÉSEAU",
    accent: "#0AFFD4",
    glow: "rgba(10,255,212,0.22)",
    tagColor: "#0AFFD4",
    tagBg: "rgba(10,255,212,0.07)",
    tagBorder: "rgba(10,255,212,0.4)",
  },
} satisfies Record<
  LessonCategory,
  {
    label: string;
    accent: string;
    glow: string;
    tagColor: string;
    tagBg: string;
    tagBorder: string;
  }
>;

const DIFF_META = {
  BEGINNER: { label: "DÉBUTANT", bars: 1, color: "#0AFFD4" },
  INTERMEDIATE: { label: "INTERMÉDIAIRE", bars: 2, color: "#6E8BFF" },
  ADVANCED: { label: "AVANCÉ", bars: 3, color: "#FF4757" },
  EXPERT: { label: "EXPERT", bars: 3, color: "#FFB020" },
} satisfies Record<LessonDifficulty, { label: string; bars: number; color: string }>;

const STATUS_META = {
  NOT_STARTED: { label: "COMMENCER", color: "#6B6890" },
  IN_PROGRESS: { label: "EN COURS", color: "#0AFFD4" },
  COMPLETED: { label: "TERMINÉ", color: "#0AFFD4" },
} satisfies Record<LessonStatus, { label: string; color: string }>;

// ── Category SVG icons - 64×64 from CatalogGrid.jsx reference ─────────────────

const SVG_BASE: CSSProperties = { display: "block" };
const iconStroke = {
  fill: "none" as const,
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconDev(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 64 64"
      width={64}
      height={64}
      style={SVG_BASE}
      stroke="currentColor"
      {...iconStroke}
    >
      <path d="M22 20 L8 32 L22 44" />
      <path d="M42 20 L56 32 L42 44" />
      <path d="M36 14 L28 50" />
    </svg>
  );
}

function IconCyber(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 64 64"
      width={64}
      height={64}
      style={SVG_BASE}
      stroke="currentColor"
      {...iconStroke}
    >
      <path d="M32 6 L52 14 V32 C52 44 42 52 32 58 C22 52 12 44 12 32 V14 Z" />
      <path d="M24 32 L30 38 L42 24" />
    </svg>
  );
}

function IconNetwork(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 64 64"
      width={64}
      height={64}
      style={SVG_BASE}
      stroke="currentColor"
      {...iconStroke}
    >
      <circle cx="32" cy="14" r="4" />
      <circle cx="14" cy="48" r="4" />
      <circle cx="50" cy="48" r="4" />
      <path d="M32 18 L14 44" />
      <path d="M32 18 L50 44" />
      <path d="M18 48 L46 48" />
    </svg>
  );
}

const CAT_ICONS = {
  DEV: IconDev,
  CYBERSEC: IconCyber,
  NETWORK: IconNetwork,
} satisfies Record<LessonCategory, () => React.ReactElement>;

// ── Deterministic cover decoration ───────────────────────────────────────────
// Each catalog card gets a unique backdrop derived from a stable key (refCode or
// title) so lessons of the same category no longer look identical. Fully
// deterministic (seeded PRNG, no Math.random) → server and client render the
// same markup, no hydration mismatch.

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface CoverDecor {
  glowX: number;
  glowY: number;
  gridSize: number;
  nodes: { x: number; y: number; r: number }[];
  lines: { x1: number; y1: number; x2: number; y2: number }[];
}

function seededCover(key: string): CoverDecor {
  const rand = mulberry32(hashSeed(key));
  const glowX = Math.round(26 + rand() * 48);
  const glowY = Math.round(28 + rand() * 44);
  const gridSize = 14 + Math.floor(rand() * 8);
  const nodeCount = 5 + Math.floor(rand() * 3); // 5..7
  const nodes = Array.from({ length: nodeCount }, () => ({
    x: Math.round(rand() * 100),
    y: Math.round(rand() * 100),
    r: Math.round((1.4 + rand() * 1.8) * 10) / 10,
  }));
  const lines: CoverDecor["lines"] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];
    if (a && b && rand() > 0.35) lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }
  return { glowX, glowY, gridSize, nodes, lines };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function DiffBars({ filled, color }: { filled: number; color: string }): React.ReactElement {
  return (
    <span style={{ display: "inline-flex", gap: 2, alignItems: "center" }}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          style={{ width: 3, height: 8, background: i <= filled ? color : "#1A1840" }}
        />
      ))}
    </span>
  );
}

function StatusIcon({ status }: { status: LessonStatus }): React.ReactElement {
  const s = {
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (status === "COMPLETED") {
    return (
      <svg viewBox="0 0 16 16" width={12} height={12} {...s}>
        <path d="M3 8 L7 12 L13 4" />
      </svg>
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <svg viewBox="0 0 16 16" width={12} height={12} {...s}>
        <circle cx="8" cy="8" r="6" />
        <path d="M8 4 V8 L11 10" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" width={12} height={12} {...s}>
      <path d="M4 3 V13 L12 8 Z" />
    </svg>
  );
}

// ── Public props ───────────────────────────────────────────────────────────────

interface LessonCardProps {
  title: string;
  slug: string;
  difficulty: LessonDifficulty;
  category: string;
  durationMinutes?: number | undefined;
  xpReward: number;
  status?: LessonStatus | undefined;
  description?: string | undefined;
  refCode?: string | undefined;
  currentSection?: number | undefined;
  totalSections?: number | undefined;
  /** "catalog" = full card with cover; "compact" = minimal list card */
  variant?: "catalog" | "compact" | undefined;
  /** Client-only: wrap with arbitrary JSX. Cannot be passed from Server Components - use <Link><LessonCard /></Link> pattern instead. */
  wrapper?: ((children: ReactNode) => ReactNode) | undefined;
  className?: string | undefined;
}

export function LessonCard({
  title,
  description,
  difficulty,
  category,
  durationMinutes,
  xpReward,
  status = "NOT_STARTED",
  refCode,
  currentSection,
  totalSections,
  variant = "compact",
  wrapper,
}: LessonCardProps): React.ReactElement {
  const catKey = category as LessonCategory;
  const catMeta = catKey in CAT_META ? CAT_META[catKey] : CAT_META.DEV;
  // SAFETY: catKey guaranteed to be LessonCategory via catKey in CAT_META check
  const CatIcon = catKey in CAT_ICONS ? CAT_ICONS[catKey] : IconDev;
  const diffMeta = DIFF_META[difficulty];

  const card =
    variant === "catalog" ? (
      <CatalogCard
        title={title}
        catMeta={catMeta}
        catLabel={catMeta.label}
        CatIcon={CatIcon}
        diffMeta={diffMeta}
        status={status}
        xpReward={xpReward}
        {...(description !== undefined ? { description } : {})}
        {...(durationMinutes !== undefined ? { durationMinutes } : {})}
        {...(refCode !== undefined ? { refCode } : {})}
        {...(currentSection !== undefined ? { currentSection } : {})}
        {...(totalSections !== undefined ? { totalSections } : {})}
      />
    ) : (
      <CompactCard
        title={title}
        catMeta={catMeta}
        diffMeta={diffMeta}
        status={status}
        xpReward={xpReward}
        {...(durationMinutes !== undefined ? { durationMinutes } : {})}
        {...(description !== undefined ? { description } : {})}
      />
    );

  return wrapper ? <>{wrapper(card)}</> : card;
}

// ── Catalog card - full reference design ──────────────────────────────────────

function CatalogCard({
  title,
  description,
  catMeta,
  catLabel,
  CatIcon,
  diffMeta,
  status,
  durationMinutes,
  xpReward,
  refCode,
  currentSection,
  totalSections,
}: {
  title: string;
  description?: string | undefined;
  catMeta: (typeof CAT_META)[LessonCategory];
  catLabel: string;
  CatIcon: () => React.ReactElement;
  diffMeta: (typeof DIFF_META)[LessonDifficulty];
  status: LessonStatus;
  durationMinutes?: number | undefined;
  xpReward: number;
  refCode?: string | undefined;
  currentSection?: number | undefined;
  totalSections?: number | undefined;
}): React.ReactElement {
  const isCompleted = status === "COMPLETED";
  const isInProgress = status === "IN_PROGRESS";
  const statusMeta = STATUS_META[status];

  // Per-card backdrop, stable from refCode (falls back to title).
  const decor = seededCover(refCode ?? title);

  const pct =
    totalSections !== undefined && totalSections > 0 && currentSection !== undefined
      ? Math.round((currentSection / totalSections) * 100)
      : 0;

  const cardBorder = isInProgress
    ? "rgba(10,255,212,0.35)"
    : isCompleted
      ? "rgba(10,255,212,0.5)"
      : "#2A2560";

  const cardBoxShadow = isInProgress
    ? "inset 3px 0 0 #0AFFD4, 0 0 24px rgba(10,255,212,0.08)"
    : "none";

  const cardBg = isCompleted
    ? "linear-gradient(180deg, rgba(10,255,212,0.04), transparent 40%), #0A0826"
    : "#0A0826";

  return (
    <article
      style={{
        position: "relative",
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 0,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease",
        boxShadow: cardBoxShadow,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = isInProgress
          ? "rgba(10,255,212,0.6)"
          : isCompleted
            ? "rgba(10,255,212,0.7)"
            : "#3F3D5C";
        const bar = e.currentTarget.querySelector("[data-accent-bar]");
        if (bar instanceof HTMLElement && !isInProgress) bar.style.opacity = "0.6";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.borderColor = cardBorder;
        const bar = e.currentTarget.querySelector("[data-accent-bar]");
        if (bar instanceof HTMLElement && !isInProgress) bar.style.opacity = "0";
      }}
    >
      {/* Left category accent bar - appears on hover (always visible on in-progress) */}
      <span
        data-accent-bar=""
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: isInProgress ? 3 : 2,
          background: isInProgress ? "#0AFFD4" : catMeta.accent,
          opacity: isInProgress ? 1 : 0,
          transition: "opacity 180ms ease",
          pointerEvents: "none",
          zIndex: 4,
          boxShadow: isInProgress ? "0 0 12px #0AFFD4" : "none",
        }}
      />

      {/* Completed hexagon check badge */}
      {isCompleted && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 26,
            height: 26,
            display: "grid",
            placeItems: "center",
            background: "#0AFFD4",
            color: "#030219",
            boxShadow: "0 0 16px rgba(10,255,212,0.55)",
            zIndex: 3,
            clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
          }}
        >
          <svg
            viewBox="0 0 16 16"
            width={12}
            height={12}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 8 L7 12 L13 4" />
          </svg>
        </span>
      )}

      {/* ── Head: category tag + difficulty badge ──────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px 10px",
        }}
      >
        {/* Category tag */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "3px 9px",
            fontFamily: "var(--font-mono, monospace)",
            fontWeight: 700,
            fontSize: 9.5,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            border: `1px solid ${catMeta.tagBorder}`,
            borderRadius: 0,
            color: catMeta.tagColor,
            background: catMeta.tagBg,
          }}
        >
          {catLabel}
        </span>

        {/* Difficulty badge - parallelogram + bars */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "3px 9px",
            fontFamily: "var(--font-mono, monospace)",
            fontWeight: 700,
            fontSize: 9.5,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: diffMeta.color,
            background: "#05041A",
            border: "1px solid #2A2560",
            clipPath: "polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)",
            ...(isCompleted ? { marginRight: 32 } : {}),
          }}
        >
          <DiffBars filled={diffMeta.bars} color={diffMeta.color} />
          <span>{diffMeta.label}</span>
        </span>
      </div>

      {/* ── Cover: grid pattern + icon ─────────────────────────────── */}
      <div
        style={{
          position: "relative",
          aspectRatio: "16 / 9",
          margin: "0 16px",
          background: "#05041A",
          border: "1px solid rgba(42,37,96,0.5)",
          overflow: "hidden",
          display: "grid",
          placeItems: "center",
        }}
      >
        {/* Grid line pattern with radial mask - density varies per card */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to right, rgba(42,37,96,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(42,37,96,0.6) 1px, transparent 1px)",
            backgroundSize: `${String(decor.gridSize)}px ${String(decor.gridSize)}px`,
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 85%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 85%)",
          }}
        />
        {/* Radial glow - per category, positioned per card */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse 70% 60% at ${String(decor.glowX)}% ${String(decor.glowY)}%, ${catMeta.glow}, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
        {/* Seeded constellation - unique per card, tinted by category */}
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }}
        >
          {decor.lines.map((l, i) => (
            <line
              key={`l-${String(i)}`}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke={catMeta.accent}
              strokeWidth={0.4}
              opacity={0.3}
            />
          ))}
          {decor.nodes.map((n, i) => (
            <circle
              key={`n-${String(i)}`}
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill={catMeta.accent}
              opacity={0.5}
            />
          ))}
        </svg>

        {/* Coordinate label top-left */}
        <span
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 9.5,
            letterSpacing: "0.14em",
            color: "#3F3D5C",
            background: "rgba(3,2,25,0.7)",
            padding: "2px 6px",
            border: "1px solid rgba(42,37,96,0.5)",
            zIndex: 2,
          }}
        >
          // {catLabel}
        </span>

        {/* Lesson ref code top-right */}
        {refCode !== undefined && (
          <span
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 9.5,
              letterSpacing: "0.1em",
              color: "#3F3D5C",
              zIndex: 2,
            }}
          >
            {refCode}
          </span>
        )}

        {/* Category icon */}
        <span
          style={{
            position: "relative",
            zIndex: 1,
            color: catMeta.accent,
            filter: `drop-shadow(0 0 12px ${catMeta.accent})`,
          }}
          aria-hidden="true"
        >
          <CatIcon />
        </span>
      </div>

      {/* ── Body: title + description ──────────────────────────────── */}
      <div
        style={{
          padding: "16px 16px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          flex: 1,
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-display, sans-serif)",
            fontWeight: 700,
            fontSize: 17,
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
            color: "#F5F5FA",
            margin: 0,
          }}
        >
          {title}
        </h3>
        {description !== undefined && (
          <p
            style={{
              fontFamily: "var(--font-body, sans-serif)",
              fontSize: 13,
              lineHeight: 1.5,
              color: "#B8B5D1",
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {description}
          </p>
        )}
      </div>

      {/* ── Progress section - in-progress cards only ──────────────── */}
      {isInProgress &&
        totalSections !== undefined &&
        totalSections > 0 &&
        currentSection !== undefined && (
          <div style={{ padding: "0 16px 14px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#6B6890",
                marginBottom: 6,
              }}
            >
              <span>
                <b style={{ color: "#0AFFD4", fontWeight: 700 }}>
                  {currentSection}/{totalSections}
                </b>
                {" SECTIONS"}
              </span>
              <span>{pct}%</span>
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
                  background: "linear-gradient(90deg, #0024FF 0%, #0AFFD4 100%)",
                  boxShadow: "0 0 8px rgba(10,255,212,0.6)",
                }}
              />
            </div>
          </div>
        )}

      {/* ── Footer: XP + duration + status ────────────────────────── */}
      <div
        style={{
          marginTop: "auto",
          padding: "12px 16px",
          borderTop: "1px solid rgba(42,37,96,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 11,
          letterSpacing: "0.06em",
          color: "#3F3D5C",
        }}
      >
        {/* XP with diamond accent */}
        <span
          style={{
            color: "#0AFFD4",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              transform: "rotate(45deg)",
              background: "#0AFFD4",
              boxShadow: "0 0 6px #0AFFD4",
              flexShrink: 0,
            }}
            aria-hidden="true"
          />
          +{xpReward} XP
        </span>

        {/* Duration */}
        {durationMinutes !== undefined && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg
              viewBox="0 0 16 16"
              width={11}
              height={11}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="8" cy="8" r="6" />
              <path d="M8 4 V8 L11 10" />
            </svg>
            {durationMinutes} min
          </span>
        )}

        {/* Status */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: statusMeta.color,
          }}
        >
          <StatusIcon status={status} />
          {statusMeta.label}
        </span>
      </div>
    </article>
  );
}

// ── Compact card - minimal list view (used on dashboard, etc.) ────────────────

function CompactCard({
  title,
  description,
  catMeta,
  diffMeta,
  status,
  durationMinutes,
  xpReward,
}: {
  title: string;
  description?: string | undefined;
  catMeta: (typeof CAT_META)[LessonCategory];
  diffMeta: (typeof DIFF_META)[LessonDifficulty];
  status: LessonStatus;
  durationMinutes?: number | undefined;
  xpReward: number;
}): React.ReactElement {
  const isCompleted = status === "COMPLETED";
  const isInProgress = status === "IN_PROGRESS";

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 16,
        minHeight: 140,
        background: "#0A0826",
        border: "1px solid #2A2560",
        borderLeft: `3px solid ${catMeta.accent}`,
        borderRadius: 0,
      }}
    >
      {/* Status dot */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          right: 12,
          top: 12,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: isCompleted ? "#0AFFD4" : isInProgress ? "#0024FF" : "#2A2560",
          boxShadow: isCompleted
            ? "0 0 6px rgba(10,255,212,0.5)"
            : isInProgress
              ? "0 0 6px rgba(0,36,255,0.6)"
              : undefined,
        }}
      />

      <h3
        style={{
          fontFamily: "var(--font-display, sans-serif)",
          fontWeight: 600,
          fontSize: 14,
          lineHeight: 1.35,
          color: "#F5F5FA",
          margin: 0,
          paddingRight: 20,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {title}
      </h3>

      {description !== undefined && (
        <p
          style={{
            fontFamily: "var(--font-body, sans-serif)",
            fontSize: 12,
            lineHeight: 1.5,
            color: "#6B6890",
            margin: 0,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {description}
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span
          style={{
            padding: "2px 8px",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: diffMeta.color,
            background: "rgba(5,4,26,0.9)",
            border: "1px solid #2A2560",
            borderRadius: 0,
          }}
        >
          {diffMeta.label}
        </span>
        <span
          style={{
            padding: "2px 8px",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: catMeta.tagColor,
            background: catMeta.tagBg,
            border: `1px solid ${catMeta.tagBorder}`,
            borderRadius: 0,
          }}
        >
          {catMeta.label}
        </span>
      </div>

      <div style={{ flex: 1 }} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          borderTop: "1px solid #2A2560",
          paddingTop: 10,
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 11,
          color: "#6B6890",
        }}
      >
        {durationMinutes !== undefined && (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <svg
              viewBox="0 0 16 16"
              width={11}
              height={11}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="8" cy="8" r="6" />
              <path d="M8 4 V8 L11 10" />
            </svg>
            <span style={{ color: "#B8B5D1" }}>{durationMinutes} min</span>
          </span>
        )}
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <svg
            viewBox="0 0 16 16"
            width={11}
            height={11}
            fill="none"
            stroke="#0AFFD4"
            strokeWidth={1.6}
          >
            <polygon points="8,2 10,6 14.5,6.5 11,10 12,14.5 8,12 4,14.5 5,10 1.5,6.5 6,6" />
          </svg>
          <span style={{ color: "#0AFFD4", fontWeight: 700 }}>{xpReward} XP</span>
        </span>
      </div>
    </div>
  );
}
