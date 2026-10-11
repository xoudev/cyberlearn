import React from "react";
import Link from "next/link";

/**
 * Server-safe presentation primitives for the admin console. All visual
 * rules live in admin-ui.css; these components only compose class names so
 * pages stay declarative and the system remains responsive by default.
 *
 * There is no palette here. A colour an inline style still needs is the CSS
 * variable itself, "var(--a-muted)", which admin-ui.css points at the shared
 * token: a copy in hex is how the console's reds and blues drifted from the
 * site's.
 */

export type Tone = "neutral" | "accent" | "info" | "warning" | "danger" | "purple";

const TONE_COLOR: Record<Tone, string> = {
  neutral: "var(--a-muted)",
  accent: "var(--a-accent)",
  info: "var(--a-info)",
  warning: "var(--a-warning)",
  danger: "var(--a-danger)",
  purple: "var(--a-purple)",
};

export function toneColor(tone: Tone): string {
  return TONE_COLOR[tone];
}

/** CSSProperties widened with custom properties (--var) used by the kit. */
export type CssWithVars = React.CSSProperties & Record<`--${string}`, string>;

// ── Page scaffolding ──────────────────────────────────────────────────────────

/**
 * One step of the trail above a page title. A step with an href is a page you
 * can go back to; one without is the section the page belongs to, or a place
 * that has no page of its own (the school a class is in).
 */
export interface Crumb {
  label: string;
  href?: string;
}

/**
 * The head of every console page: where it sits, what it is, what you can do
 * from it. The trail starts with the section and lists the parents; the page
 * itself is the title, not a last crumb. It is a navigation landmark only when
 * it has somewhere to go: on a top-level page it is the section's name alone.
 */
export function PageHeader({
  crumbs,
  title,
  description,
  actions,
}: {
  crumbs: readonly [Crumb, ...Crumb[]];
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}): React.ReactElement {
  const trail = (
    <ol className="a-crumbs">
      {crumbs.map((crumb, index) => (
        // A school and its year can share a name, so the place in the trail
        // is part of the key.
        <li key={`${String(index)}:${crumb.label}`}>
          {crumb.href !== undefined ? <Link href={crumb.href}>{crumb.label}</Link> : crumb.label}
        </li>
      ))}
    </ol>
  );
  return (
    <header className="a-page-head">
      <div>
        {crumbs.some((crumb) => crumb.href !== undefined) ? (
          <nav className="a-eyebrow" aria-label="Fil d'Ariane">
            {trail}
          </nav>
        ) : (
          <div className="a-eyebrow">{trail}</div>
        )}
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

/**
 * A value with its colour. Most take a tone of the scale; a value that has a
 * colour of its own on the site passes it instead, as a badge's rarity does
 * with "var(--a-rarity-rare)", so the console shows it the way the site does.
 */
export function Tag({
  tone = "neutral",
  color,
  children,
}: {
  tone?: Tone;
  color?: string;
  children: React.ReactNode;
}): React.ReactElement {
  const tagStyle: CssWithVars | undefined = color === undefined ? undefined : { "--tag": color };
  return (
    <span className="a-tag" data-tone={tone} style={tagStyle}>
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
  const accent = tone === "neutral" ? "var(--a-border-2)" : TONE_COLOR[tone];
  return (
    <span
      style={{
        width: size,
        height: size,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        background: `color-mix(in srgb, ${accent} 22%, var(--a-surface-2))`,
        border: `1px solid color-mix(in srgb, ${accent} 45%, transparent)`,
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        fontSize: Math.round(size * 0.38),
        color: "var(--a-fg-2)",
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
