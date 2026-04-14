import { type VariantProps } from "class-variance-authority";
declare const levelBadgeVariants: (
  props?:
    | ({
        size?: "sm" | "md" | "lg" | null | undefined;
      } & import("class-variance-authority/types").ClassProp)
    | undefined,
) => string;
interface LevelBadgeProps extends VariantProps<typeof levelBadgeVariants> {
  level: number;
  className?: string;
}
/**
 * Badge showing the user's current level.
 * sm: compact pill (number only). md/lg: pill with "NV." prefix.
 */
export declare function LevelBadge({
  level,
  size,
  className,
}: LevelBadgeProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=level-badge.d.ts.map
