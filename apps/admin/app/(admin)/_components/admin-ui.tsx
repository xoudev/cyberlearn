import React from "react";
import Link from "next/link";

/**
 * Server-safe presentation primitives for the admin console. All visual
 * rules live in admin-ui.css; these components only compose class names so
 * pages stay declarative and the system remains responsive by default.
 */

export const UI = {
  bg: "#030219",
  surface: "#0A0826",
  surfaceDeep: "#05041A",
  border: "#1F1B47",
  borderStrong: "#2A2560",
  fg: "#F5F5FA",
  fg2: "#B8B5D1",
  muted: "#7F7BA9",
  faint: "#3F3D5C",
  turquoise: "#0AFFD4",
  blue: "#0024FF",
  blueSoft: "#6E8BFF",
  danger: "#FF4D6D",
  warning: "#FFB020",
  purple: "#B14DFF",
  mono: "var(--font-mono)",
  sans: "var(--font-sans)",
} as const;

export type Tone = "neutral" | "accent" | "info" | "warning" | "danger" | "purple";

const TONE_COLOR: Record<Tone, string> = {
  neutral: UI.muted,
  accent: UI.turquoise,
  info: UI.blueSoft,
  warning: UI.warning,
  danger: UI.danger,
  purple: UI.purple,
};

export function toneColor(tone: Tone): string {
  return TONE_COLOR[tone];
}

/** CSSProperties widened with custom properties (--var) used by the kit. */
export type CssWithVars = React.CSSProperties & Record<`--${string}`, string>;

// ── Page scaffolding ──────────────────────────────────────────────────────────

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}): React.ReactElement {
  return (
    <header className="a-page-head">
      <div>
        <div className="a-eyebrow">{eyebrow}</div>
        <h1 className="a-h1">{title}</h1>
        {description ? <p className="a-sub">{description}</p> : null}
      </div>
      {actions ? <div className="a-head-actions">{actions}</div> : null}
    </header>
  );
}

export function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Link href={href} className="a-btn a-btn--primary">
      {children}
    </Link>
  );
}

export function GhostLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Link href={href} className="a-btn a-btn--ghost">
      {children}
    </Link>
  );
}

// ── Surfaces ──────────────────────────────────────────────────────────────────

export function Card({
  title,
  action,
  children,
  pad = false,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  pad?: boolean;
}): React.ReactElement {
  return (
    <section className="a-card">
      {title !== undefined ? (
        <div className="a-card-head">
          <h2 className="a-card-title">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className={pad ? "a-card-pad" : undefined}>{children}</div>
    </section>
  );
}

export function CardLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Link href={href} className="a-card-link">
      {children}
    </Link>
  );
}

// ── KPI with trend sparkline ──────────────────────────────────────────────────

function Sparkline({
  points,
  width = 88,
  height = 30,
}: {
  points: number[];
  width?: number;
  height?: number;
}): React.ReactElement | null {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const coords = points.map((value, index) => {
    const x = index * step;
    const y = height - 3 - ((value - min) / range) * (height - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      className="a-kpi-spark"
      width={width}
      height={height}
      viewBox={`0 0 ${String(width)} ${String(height)}`}
      fill="none"
      aria-hidden="true"
    >
      <polyline
        points={coords.join(" ")}
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={coords[coords.length - 1]?.split(",")[0]}
        cy={coords[coords.length - 1]?.split(",")[1]}
        r={2.4}
        fill="currentColor"
      />
    </svg>
  );
}

export function KpiCard({
  label,
  value,
  delta,
  series,
  tone = "accent",
}: {
  label: string;
  value: string;
  delta?: React.ReactNode;
  series?: number[];
  tone?: Tone;
}): React.ReactElement {
  const kpiStyle: CssWithVars = { "--kpi-accent": TONE_COLOR[tone] };
  return (
    <div className="a-kpi" style={kpiStyle}>
      <div className="a-kpi-label">{label}</div>
      <div className="a-kpi-value">{value}</div>
      {series ? <Sparkline points={series} /> : null}
      {delta ? <div className="a-kpi-delta">{delta}</div> : null}
    </div>
  );
}

// ── Badges & identity ─────────────────────────────────────────────────────────

export function Tag({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <span className="a-tag" data-tone={tone}>
      {children}
    </span>
  );
}

export function Monogram({
  text,
  size = 24,
  tone = "neutral",
}: {
  text: string;
  size?: number;
  tone?: Tone;
}): React.ReactElement {
  const accent = tone === "neutral" ? UI.borderStrong : TONE_COLOR[tone];
  return (
    <span
      style={{
        width: size,
        height: size,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        background: `color-mix(in srgb, ${accent} 22%, ${UI.surfaceDeep})`,
        border: `1px solid color-mix(in srgb, ${accent} 45%, transparent)`,
        fontFamily: UI.mono,
        fontWeight: 700,
        fontSize: Math.round(size * 0.38),
        color: UI.fg2,
        textTransform: "uppercase",
      }}
    >
      {text.slice(0, 2)}
    </span>
  );
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text?: string | undefined;
  action?: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="a-empty">
      <span className="a-empty-icon" aria-hidden="true">
        <svg
          width="18"
          height="18"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2.5" y="3.5" width="11" height="9" />
          <path d="M2.5 6.5h11" />
        </svg>
      </span>
      <p className="a-empty-title">{title}</p>
      {text ? <p className="a-empty-text">{text}</p> : null}
      {action}
    </div>
  );
}
