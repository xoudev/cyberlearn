import { cn } from "@cyberlearn/ui";
import "./skeleton.css";

/** Square, like the site; "circle" only for an element that is round itself (a ring). */
type Radius = "circle";

function toLength(value: number | string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" ? `${String(value)}px` : value;
}

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Convenience width - number is treated as px, string as a CSS length. */
  w?: number | string;
  /** Convenience height - number is treated as px, string as a CSS length. */
  h?: number | string;
  /** "circle" for a round element; every other block is square, as the site is. */
  radius?: Radius;
}

/**
 * The single shared shimmer block. Size it with `w`/`h` (or `style`); every
 * loading state in the app composes this primitive - no per-page shimmer.
 */
function Skeleton({ className, w, h, radius, style, ...props }: SkeletonProps): React.ReactElement {
  return (
    <div
      className={cn("cl-skel", className)}
      style={{
        width: toLength(w),
        height: toLength(h),
        borderRadius: radius === "circle" ? "50%" : undefined,
        ...style,
      }}
      {...props}
    />
  );
}

/**
 * Standard card surface used across loading states (matches the real cards).
 * Override `style`/`className` when a specific card's border or radius differs.
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
