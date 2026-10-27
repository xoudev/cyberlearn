"use client";

import type { ReactNode, CSSProperties } from "react";
import React from "react";
import {
  CATEGORY_META,
  DIFFICULTY_META,
  isContentCategory,
  type ContentCategory,
  type ContentDifficulty,
  type DifficultyMeta,
} from "@cyberlearn/lib/content/vocabulary";

export type LessonDifficulty = ContentDifficulty;
export type LessonStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type LessonCategory = ContentCategory;

// ── Design tokens - per CatalogGrid.jsx / catalog.css reference ───────────────

/** The card's colours for a category, all from its one: the accent, a glow, a tag. */
function catStyle(key: LessonCategory): {
  label: string;
  accent: string;
  glow: string;
  tagColor: string;
  tagBg: string;
  tagBorder: string;
} {
  const { short, color } = CATEGORY_META[key];
  return {
    label: short.toUpperCase(),
    accent: color,
    glow: `color-mix(in srgb, ${color} 25%, transparent)`,
    tagColor: color,
    tagBg: `color-mix(in srgb, ${color} 9%, transparent)`,
    tagBorder: `color-mix(in srgb, ${color} 42%, transparent)`,
  };
}

/** Three bars: the fourth level lights them all, like the third. */
function barsOf(level: number): number {
  return Math.min(3, level);
}

const STATUS_META = {
  NOT_STARTED: { label: "Commencer", color: "#aaa79f" },
  IN_PROGRESS: { label: "En cours", color: "var(--cosmetic-accent)" },
  COMPLETED: { label: "Terminé", color: "var(--color-state-success, #62d4a1)" },
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

// Curated, center-safe circuit-board geometry in a 320x180 (true 16:9) space.
// The central band (x 112-208, y 54-126) and the label corners are kept clear so
// the category glyph and ref code stay legible. Per card we reseed which traces
// render, which ones are highlighted, the pad/via/dot subset, a horizontal mirror
// and a small vertical shift - so two lessons never share the same board.
const CIRCUIT_TRACES = [
  "M0 30 L40 30 L52 42 L88 42 L100 30 L150 30",
  "M0 52 L24 52 L36 64 L36 96",
  "M30 150 L70 150 L82 138 L82 96 L94 84 L120 84",
  "M320 44 L274 44 L262 56 L210 56",
  "M320 70 L296 70 L284 82 L284 120 L272 132 L230 132 L218 144 L150 144",
  "M320 104 L300 104 L288 116 L250 116",
  "M20 120 L60 120 L72 132 L108 132",
  "M168 36 L200 36 L212 24",
  "M150 156 L120 156 L108 168",
  "M0 88 L28 88 L40 76 L40 40 L52 28 L96 28",
  "M320 150 L286 150 L274 138 L274 100 L262 88 L226 88",
  "M44 168 L44 144 L56 132 L92 132",
  "M276 24 L276 50 L264 62 L232 62",
] as const;

const CIRCUIT_PADS = [
  { x: 148, y: 27 },
  { x: 206, y: 53 },
  { x: 93, y: 25 },
  { x: 147, y: 141 },
  { x: 223, y: 85 },
  { x: 105, y: 129 },
] as const;

const CIRCUIT_VIAS = [
  { x: 36, y: 96, r: 3 },
  { x: 284, y: 120, r: 3 },
  { x: 40, y: 40, r: 2.5 },
  { x: 274, y: 100, r: 2.5 },
  { x: 82, y: 96, r: 2.5 },
  { x: 250, y: 116, r: 2.5 },
  { x: 72, y: 132, r: 2.5 },
  { x: 212, y: 24, r: 2.5 },
  { x: 108, y: 168, r: 2.5 },
] as const;

const CIRCUIT_DOTS = [
  { x: 40, y: 76 },
  { x: 262, y: 56 },
  { x: 56, y: 132 },
  { x: 264, y: 62 },
  { x: 288, y: 116 },
  { x: 52, y: 42 },
] as const;

// Deterministic Fisher-Yates - same seed in, same order out (SSR-safe).
function shuffle<T>(input: readonly T[], rand: () => number): T[] {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const ai = a[i];
    const aj = a[j];
    if (ai !== undefined && aj !== undefined) {
      a[i] = aj;
      a[j] = ai;
    }
  }
  return a;
}

interface CoverDecor {
  glowX: number;
  glowY: number;
  gridSize: number;
  mirror: boolean;
  shiftY: number;
  accentOpacity: number;
  faintTraces: string[];
  accentTraces: string[];
  pads: { x: number; y: number }[];
  vias: { x: number; y: number; r: number }[];
  dots: { x: number; y: number }[];
}

function seededCover(key: string): CoverDecor {
  const rand = mulberry32(hashSeed(key));
  const glowX = Math.round(26 + rand() * 48);
  const glowY = Math.round(28 + rand() * 44);
  const gridSize = 14 + Math.floor(rand() * 8);
  const mirror = rand() < 0.5;
  const shiftY = Math.round(rand() * 6 - 3); // -3..3
  const accentOpacity = Math.round((0.28 + rand() * 0.1) * 100) / 100; // 0.28..0.38

  const keepCount = 10 + Math.floor(rand() * 3); // 10..12 traces
  const kept = shuffle(CIRCUIT_TRACES, rand).slice(0, keepCount);
  const accentCount = 3 + Math.floor(rand() * 2); // 3..4 highlighted
  const accentTraces = shuffle(kept, rand).slice(0, accentCount);
  const accentSet = new Set(accentTraces);
  const faintTraces = kept.filter((d) => !accentSet.has(d));

  const pads = shuffle(CIRCUIT_PADS, rand).slice(0, 3 + Math.floor(rand() * 3)); // 3..5
  const vias = shuffle(CIRCUIT_VIAS, rand).slice(0, 5 + Math.floor(rand() * 3)); // 5..7
  const dots = shuffle(CIRCUIT_DOTS, rand).slice(0, 3 + Math.floor(rand() * 3)); // 3..5

  return {
    glowX,
    glowY,
    gridSize,
    mirror,
    shiftY,
    accentOpacity,
    faintTraces,
    accentTraces,
    pads: [...pads],
    vias: [...vias],
    dots: [...dots],
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function DiffBars({ filled, color }: { filled: number; color: string }): React.ReactElement {
  return (
    <span style={{ display: "inline-flex", gap: 2, alignItems: "center" }}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          style={{ width: 3, height: 8, background: i <= filled ? color : "#303137" }}
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
  /** Resolved cover image src (signed URL). When set, replaces the seeded circuit backdrop. */
  coverSrc?: string | null | undefined;
  currentSection?: number | undefined;
  totalSections?: number | undefined;
  /**
   * A completed lesson's quiz score, right answers out of its quizzes. Shown
   * beside "Terminé" on the catalogue card; absent for a lesson without
   * quizzes, or completed before answers were recorded.
   */
  quizScore?: { correct: number; total: number } | null | undefined;
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
  coverSrc,
  currentSection,
  totalSections,
  quizScore,
  variant = "compact",
  wrapper,
}: LessonCardProps): React.ReactElement {
  const catKey: LessonCategory = isContentCategory(category) ? category : "DEV";
  const catMeta = catStyle(catKey);
  const CatIcon = CAT_ICONS[catKey];
  const diffMeta = DIFFICULTY_META[difficulty];

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
        coverSrc={coverSrc ?? null}
        {...(currentSection !== undefined ? { currentSection } : {})}
        {...(totalSections !== undefined ? { totalSections } : {})}
        quizScore={status === "COMPLETED" ? (quizScore ?? null) : null}
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
  coverSrc,
  currentSection,
  totalSections,
  quizScore,
}: {
  title: string;
  description?: string | undefined;
  catMeta: ReturnType<typeof catStyle>;
  catLabel: string;
  CatIcon: () => React.ReactElement;
  diffMeta: DifficultyMeta;
  status: LessonStatus;
  durationMinutes?: number | undefined;
  xpReward: number;
  refCode?: string | undefined;
  coverSrc?: string | null | undefined;
  currentSection?: number | undefined;
  totalSections?: number | undefined;
  quizScore: { correct: number; total: number } | null;
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

  // Bastion: a matt panel, a separator, and the equipped accent only where the
  // lesson is underway. No halo, no tinted wash.
  const cardBorder = isInProgress
    ? "color-mix(in srgb, var(--cosmetic-accent) 55%, transparent)"
    : "#303137";

  const cardBoxShadow = isInProgress ? "inset 3px 0 0 var(--cosmetic-accent)" : "none";

  const cardBg = "#121418";

  return (
    <article
      style={{
        position: "relative",
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 180ms ease",
        boxShadow: cardBoxShadow,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = isInProgress ? "var(--cosmetic-accent)" : "#74767d";
        const bar = e.currentTarget.querySelector("[data-accent-bar]");
        if (bar instanceof HTMLElement && !isInProgress) bar.style.opacity = "0.6";
      }}
      onMouseLeave={(e) => {
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
          background: isInProgress ? "var(--cosmetic-accent)" : catMeta.accent,
          opacity: isInProgress ? 1 : 0,
          transition: "opacity 180ms ease",
          pointerEvents: "none",
          zIndex: 4,
        }}
      />

      {/* Completed: a square check on the accent */}
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
            background: "var(--cosmetic-accent)",
            color: "#0b0c0e",
            zIndex: 3,
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
            fontFamily: "var(--font-interface, var(--font-sans, sans-serif))",
            fontWeight: 600,
            fontSize: 12,
            border: `1px solid ${catMeta.tagBorder}`,
            color: catMeta.tagColor,
            background: catMeta.tagBg,
          }}
        >
          {catLabel}
        </span>

        {/* Difficulty badge - bars + label */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "3px 9px",
            fontFamily: "var(--font-interface, var(--font-sans, sans-serif))",
            fontWeight: 600,
            fontSize: 12,
            color: diffMeta.color,
            background: "#0b0c0e",
            border: "1px solid #303137",
            ...(isCompleted ? { marginRight: 32 } : {}),
          }}
        >
          <DiffBars filled={barsOf(diffMeta.level)} color={diffMeta.color} />
          <span>{diffMeta.label}</span>
        </span>
      </div>

      {/* ── Cover: grid pattern + icon ─────────────────────────────── */}
      <div
        style={{
          position: "relative",
          aspectRatio: "16 / 9",
          margin: "0 16px",
          background: "#0b0c0e",
          border: "1px solid #303137",
          overflow: "hidden",
          display: "grid",
          placeItems: "center",
        }}
      >
        {coverSrc ? (
          <>
            {/* Custom uploaded cover (signed URL from the private bucket). Plain
                <img>, not next/image: signed URLs rotate and would churn the
                optimizer cache. */}
            <img
              src={coverSrc}
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                zIndex: 0,
              }}
            />
            {/* Legibility veil so the corner labels stay readable over the image */}
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 1,
                pointerEvents: "none",
                background:
                  "linear-gradient(180deg, #0b0c0e8c 0%, transparent 30%, transparent 68%, #0b0c0e73 100%)",
              }}
            />
          </>
        ) : (
          <>
            {/* Seeded circuit traces - unique per card, tinted by category */}
            <svg
              aria-hidden="true"
              viewBox="0 0 320 180"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }}
            >
              <g
                transform={
                  decor.mirror
                    ? `translate(320 ${String(decor.shiftY)}) scale(-1 1)`
                    : `translate(0 ${String(decor.shiftY)})`
                }
              >
                {/* Faint traces - the base texture */}
                <g
                  fill="none"
                  stroke={catMeta.accent}
                  strokeOpacity={0.18}
                  strokeWidth={1}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {decor.faintTraces.map((d, i) => (
                    <path key={`f-${String(i)}`} d={d} />
                  ))}
                </g>
                {/* Highlighted traces */}
                <g
                  fill="none"
                  stroke={catMeta.accent}
                  strokeWidth={1}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={decor.accentOpacity}
                >
                  {decor.accentTraces.map((d, i) => (
                    <path key={`a-${String(i)}`} d={d} />
                  ))}
                </g>
                {/* Solder pads */}
                <g fill={catMeta.accent} opacity={0.3}>
                  {decor.pads.map((p, i) => (
                    <rect key={`p-${String(i)}`} x={p.x} y={p.y} width={6} height={6} rx={0.5} />
                  ))}
                </g>
                {/* Vias */}
                <g
                  fill="var(--color-bg-sunken)"
                  stroke={catMeta.accent}
                  strokeWidth={0.8}
                  opacity={0.36}
                >
                  {decor.vias.map((v, i) => (
                    <circle key={`v-${String(i)}`} cx={v.x} cy={v.y} r={v.r} />
                  ))}
                </g>
                {/* Trace dots */}
                <g fill={catMeta.accent} opacity={0.22}>
                  {decor.dots.map((dt, i) => (
                    <circle key={`d-${String(i)}`} cx={dt.x} cy={dt.y} r={1.3} />
                  ))}
                </g>
              </g>
            </svg>
          </>
        )}

        {/* Lesson ref code top-right */}
        {refCode !== undefined && (
          <span
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 11,
              color: "#aaa79f",
              zIndex: 2,
            }}
          >
            {refCode}
          </span>
        )}

        {/* Category icon - hidden when a custom cover image is shown */}
        {!coverSrc && (
          <span
            style={{
              position: "relative",
              zIndex: 1,
              color: catMeta.accent,
            }}
            aria-hidden="true"
          >
            <CatIcon />
          </span>
        )}
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
            color: "var(--color-text-primary)",
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
              color: "var(--color-text-secondary)",
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
                fontFamily: "var(--font-interface, var(--font-sans, sans-serif))",
                fontSize: 12,
                color: "#aaa79f",
                marginBottom: 6,
              }}
            >
              <span>
                <b style={{ color: "#f4f2ed", fontWeight: 700 }}>
                  {currentSection}/{totalSections}
                </b>
                {" sections"}
              </span>
              <span>{pct}%</span>
            </div>
            <div
              style={{
                position: "relative",
                height: 4,
                background: "#303137",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${String(pct)}%`,
                  background: "var(--cosmetic-accent)",
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
          borderTop: "1px solid #303137",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          fontFamily: "var(--font-interface, var(--font-sans, sans-serif))",
          fontSize: 12,
          color: "#aaa79f",
        }}
      >
        {/* XP, a figure: mono, in the accent */}
        <span
          style={{
            color: "var(--cosmetic-accent)",
            fontFamily: "var(--font-mono, monospace)",
            fontWeight: 700,
          }}
        >
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
            color: statusMeta.color,
          }}
        >
          <StatusIcon status={status} />
          {statusMeta.label}
          {quizScore !== null && (
            <span
              title={`Quiz : ${String(quizScore.correct)} bonne${quizScore.correct > 1 ? "s" : ""} réponse${quizScore.correct > 1 ? "s" : ""} sur ${String(quizScore.total)}`}
              style={{
                marginLeft: 4,
                padding: "1px 6px",
                border: `1px solid color-mix(in srgb, ${quizScoreColor(quizScore)} 40%, transparent)`,
                color: quizScoreColor(quizScore),
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 700,
              }}
            >
              <span className="sr-only">Quiz : </span>
              {quizScore.correct}/{quizScore.total}
            </span>
          )}
        </span>
      </div>
    </article>
  );
}

/** Full marks in the accent, a pass in soft white, below half in amber. */
function quizScoreColor(score: { correct: number; total: number }): string {
  if (score.correct === score.total) return "var(--cosmetic-accent)";
  return score.correct * 2 >= score.total ? "var(--color-text-secondary)" : "var(--color-warning)";
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
  catMeta: ReturnType<typeof catStyle>;
  diffMeta: DifficultyMeta;
  status: LessonStatus;
  durationMinutes?: number | undefined;
  xpReward: number;
}): React.ReactElement {
  const isCompleted = status === "COMPLETED";
  const isInProgress = status === "IN_PROGRESS";

  return (
    <div
      className="card"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 16,
        minHeight: 140,
        borderLeft: `3px solid ${catMeta.accent}`,
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
          background: isCompleted ? "var(--cosmetic-accent)" : isInProgress ? "#f4f2ed" : "#303137",
        }}
      />

      <h3
        style={{
          fontFamily: "var(--font-display, sans-serif)",
          fontWeight: 600,
          fontSize: 14,
          lineHeight: 1.35,
          color: "var(--color-text-primary)",
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
            color: "var(--color-text-muted)",
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
            fontFamily: "var(--font-interface, var(--font-sans, sans-serif))",
            fontSize: 12,
            fontWeight: 600,
            color: diffMeta.color,
            background: "#0b0c0e",
            border: "1px solid #303137",
          }}
        >
          {diffMeta.label}
        </span>
        <span
          style={{
            padding: "2px 8px",
            fontFamily: "var(--font-interface, var(--font-sans, sans-serif))",
            fontSize: 12,
            fontWeight: 600,
            color: catMeta.tagColor,
            background: catMeta.tagBg,
            border: `1px solid ${catMeta.tagBorder}`,
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
          borderTop: "1px solid #303137",
          paddingTop: 10,
          fontFamily: "var(--font-interface, var(--font-sans, sans-serif))",
          fontSize: 12,
          color: "#aaa79f",
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
            <span style={{ color: "var(--color-text-secondary)" }}>{durationMinutes} min</span>
          </span>
        )}
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <svg
            viewBox="0 0 16 16"
            width={11}
            height={11}
            fill="none"
            stroke="var(--cosmetic-accent)"
            strokeWidth={1.6}
          >
            <polygon points="8,2 10,6 14.5,6.5 11,10 12,14.5 8,12 4,14.5 5,10 1.5,6.5 6,6" />
          </svg>
          <span
            style={{
              color: "var(--cosmetic-accent)",
              fontFamily: "var(--font-mono, monospace)",
              fontWeight: 700,
            }}
          >
            {xpReward} XP
          </span>
        </span>
      </div>
    </div>
  );
}
