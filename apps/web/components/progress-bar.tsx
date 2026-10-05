import React from "react";
import { cn } from "@cyberlearn/ui";

export type ProgressBarSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface ProgressBarProps {
  /** How far along, from 0 to `max`. */
  value: number;
  max?: number;
  /** What the bar measures, for the screen reader: the figure beside it is for the eye. */
  label: string;
  size?: ProgressBarSize;
  /** The brand gradient by default; "warning" for a count running out. */
  tone?: "accent" | "warning";
  /** One colour instead of the gradient: a rarity, a verdict. */
  color?: string;
  /** A tick at this many percent: a threshold to pass. */
  marker?: number;
  /** A bright tip at the end of the fill, for the bars wide enough to carry one. */
  tip?: boolean;
  /** The width eases to its value: a score being revealed. */
  animated?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * The progress bar: a track, a fill, at most a tick and a bright tip.
 *
 * Seventeen files drew their own, in objects of style or in their own
 * stylesheet, and three of them told a screen reader what they were. This is
 * the one drawing, with the one `role="progressbar"`, for the hero of the
 * catalogue, the cards, the class list, the exam, the badges and the quests.
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  size = "sm",
  tone = "accent",
  color,
  marker,
  tip = false,
  animated = false,
  className,
  style,
}: ProgressBarProps): React.JSX.Element {
  const clamped = max > 0 ? Math.min(Math.max(value, 0), max) : 0;
  const pct = max > 0 ? (clamped / max) * 100 : 0;
  const lit = tip && pct > 0;
  // A custom property is a valid inline style that CSSProperties does not list.
  const vars: (React.CSSProperties & { "--pbar-color": string }) | null =
    color !== undefined ? { "--pbar-color": color } : null;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(clamped)}
      className={cn(
        "pbar",
        `pbar--${size}`,
        tone === "warning" && "pbar--warning",
        color !== undefined && "pbar--color",
        (lit || marker !== undefined) && "pbar--open",
        animated && "pbar--animated",
        className,
      )}
      style={vars ? { ...style, ...vars } : style}
    >
      <i
        className={cn("pbar__fill", lit && "pbar__fill--tip")}
        style={{ width: `${pct.toFixed(1)}%` }}
      />
      {marker !== undefined && (
        <i className="pbar__mark" style={{ left: `${String(marker)}%` }} aria-hidden="true" />
      )}
    </div>
  );
}
