interface PathProgressProps {
  /** Number of completed lessons */
  completedLessons: number;
  /** Total lessons in the path */
  totalLessons: number;
  /** Name of the path */
  pathName?: string;
  /** Display a vertical step list instead of a simple bar */
  variant?: "bar" | "compact";
  className?: string;
}
/**
 * Displays progress through a learning path.
 * "bar" variant: progress bar + fraction.
 * "compact" variant: fraction and small pill.
 */
export declare function PathProgress({
  completedLessons,
  totalLessons,
  pathName,
  variant,
  className,
}: PathProgressProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=path-progress.d.ts.map
