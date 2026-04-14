import { type VariantProps } from "class-variance-authority";
/** Badge rarities must match the BadgeRarity enum in Prisma */
export type BadgeRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
declare const rarityBadgeVariants: (
  props?:
    | ({
        rarity?: "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | null | undefined;
      } & import("class-variance-authority/types").ClassProp)
    | undefined,
) => string;
interface RarityBadgeProps extends VariantProps<typeof rarityBadgeVariants> {
  rarity: BadgeRarity;
  /** Render a color dot before the label */
  showDot?: boolean;
  className?: string;
}
export declare function RarityBadge({
  rarity,
  showDot,
  className,
}: RarityBadgeProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=rarity-badge.d.ts.map
