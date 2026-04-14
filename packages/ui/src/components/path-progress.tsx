import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "../lib/utils.js";

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
export function PathProgress({
  completedLessons,
  totalLessons,
  pathName,
  variant = "bar",
  className,
}: PathProgressProps) {
  const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const isComplete = percent === 100;

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {isComplete ? (
          <CheckCircle2 size={14} style={{ color: "var(--color-success)" }} />
        ) : (
          <Circle size={14} style={{ color: "var(--color-text-muted)" }} />
        )}
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {completedLessons}/{totalLessons} leçons
        </span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {pathName && (
        <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
          {pathName}
        </p>
      )}
      <div className="flex items-center gap-3">
        {/* Bar */}
        <div
          className="h-2 flex-1 overflow-hidden rounded-full"
          style={{ backgroundColor: "var(--color-border-default)" }}
          role="progressbar"
          aria-valuenow={completedLessons}
          aria-valuemin={0}
          aria-valuemax={totalLessons}
          aria-label={`${percent}% du parcours complété`}
        >
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${percent}%`,
              background: isComplete
                ? "var(--color-success)"
                : "linear-gradient(90deg, var(--color-brand-blue), var(--color-brand-turquoise))",
            }}
          />
        </div>
        {/* Fraction */}
        <span
          className="shrink-0 text-xs tabular-nums"
          style={{ color: "var(--color-text-muted)" }}
        >
          {completedLessons}/{totalLessons}
        </span>
      </div>
    </div>
  );
}
