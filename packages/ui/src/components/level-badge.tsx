import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils.js";

const levelBadgeVariants = cva(
  "inline-flex items-center gap-1 font-bold tabular-nums select-none",
  {
    variants: {
      size: {
        sm: "rounded-full h-5 px-2 text-[9px] tracking-wide",
        md: "rounded-lg h-7 px-2.5 text-xs tracking-wide",
        lg: "rounded-xl h-9 px-3 text-sm tracking-wide",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

interface LevelBadgeProps extends VariantProps<typeof levelBadgeVariants> {
  level: number;
  className?: string;
}

/**
 * Badge showing the user's current level.
 * sm: compact pill (number only). md/lg: pill with "NV." prefix.
 */
export function LevelBadge({ level, size, className }: LevelBadgeProps) {
  const showLabel = size !== "sm";

  return (
    <span
      className={cn(levelBadgeVariants({ size }), className)}
      style={{
        background:
          "linear-gradient(135deg, var(--color-brand-blue), var(--color-brand-turquoise))",
        color: "#ffffff",
        boxShadow:
          "0 1px 3px color-mix(in srgb, var(--color-brand-blue) 40%, transparent), inset 0 1px 0 rgba(255,255,255,0.15)",
      }}
      aria-label={`Niveau ${level}`}
    >
      {showLabel && (
        <span
          style={{
            fontSize: "0.65em",
            opacity: 0.85,
            fontWeight: 600,
            letterSpacing: "0.08em",
            lineHeight: 1,
          }}
        >
          NV.
        </span>
      )}
      <span style={{ lineHeight: 1 }}>{level}</span>
    </span>
  );
}
