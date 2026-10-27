import React from "react";
import { cn } from "../lib/utils.js";

/**
 * The loading placeholders of both apps: the site and the console draw every
 * loading state with these, so neither keeps a shimmer of its own. The styles
 * are in skeleton.css, which each app's globals.css imports.
 *
 * Square, as both apps are, the Bastion way: even a placeholder for a dot or
 * an avatar is a square block, since what it stands in for is square too.
 */

type Radius = "circle";

function toLength(value: number | string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" ? `${String(value)}px` : value;
}

export interface SkeletonProps extends React.HTMLAttributes<HTMLElement> {
  /** Convenience width - number is treated as px, string as a CSS length. */
  w?: number | string;
  /** Convenience height - number is treated as px, string as a CSS length. */
  h?: number | string;
  /**
   * Accepted for the callers that still pass it, and ignored: Bastion has no
   * round element left for a placeholder to imitate.
   */
  radius?: Radius;
  /**
   * "span" to stand in for text where a <div> would break the markup: inside
   * a <p>, a <th>, a <label>. It lays out as an inline block.
   */
  as?: "div" | "span";
}

/**
 * The single shared shimmer block. Size it with `w`/`h` (or `style`); every
 * loading state composes this primitive - no per-page shimmer.
 */
function Skeleton({
  as: Tag = "div",
  className,
  w,
  h,
  // Taken out of `props` so it never reaches the DOM element, then set aside:
  // the block is always square.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- see above
  radius: _radius,
  style,
  ...props
}: SkeletonProps): React.ReactElement {
  return (
    <Tag
      className={cn("cl-skel", className)}
      style={{
        width: toLength(w),
        height: toLength(h),
        ...style,
      }}
      {...props}
    />
  );
}

/**
 * Standard card surface used across loading states (matches the real cards).
 * Override `style`/`className` when a specific card's border differs.
 */
function SkeletonCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div className={cn("cl-skel-card", className)} {...props}>
      {children}
    </div>
  );
}

interface SkeletonTextProps {
  /** Number of lines. */
  lines?: number;
  /** Width of the final (short) line. */
  lastWidth?: number | string;
  /** Height of each line. */
  lineHeight?: number;
  /** Gap between lines. */
  gap?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** A stack of text lines (full width, short last line) - the common paragraph. */
function SkeletonText({
  lines = 3,
  lastWidth = "60%",
  lineHeight = 13,
  gap = 8,
  className,
  style,
}: SkeletonTextProps): React.ReactElement {
  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} h={lineHeight} w={i === lines - 1 ? lastWidth : "100%"} />
      ))}
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonText };
