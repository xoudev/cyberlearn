import type { CSSProperties } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils.js";

/** Badge rarities must match the BadgeRarity enum in Prisma */
export type BadgeRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

/** French rarity labels (UPPERCASE-rendered at call sites). Single source of truth. */
export const BADGE_RARITY_LABELS: Record<BadgeRarity, string> = {
  COMMON: "Commun",
  RARE: "Rare",
  EPIC: "Épique",
  LEGENDARY: "Légendaire",
};

/** Canonical display order (rarest first). */
export const BADGE_RARITY_ORDER: BadgeRarity[] = ["LEGENDARY", "EPIC", "RARE", "COMMON"];

const rarityBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
  {
    variants: {
      rarity: {
        COMMON: "",
        RARE: "",
        EPIC: "",
        LEGENDARY: "",
      },
    },
    defaultVariants: {
      rarity: "COMMON",
    },
  },
);

const RARITY_STYLES: Record<BadgeRarity, CSSProperties> = {
  COMMON: {
    backgroundColor: "color-mix(in srgb, var(--color-rarity-common) 15%, transparent)",
    color: "var(--color-rarity-common)",
    border: "1px solid color-mix(in srgb, var(--color-rarity-common) 30%, transparent)",
  },
  RARE: {
    backgroundColor: "color-mix(in srgb, var(--color-rarity-rare) 15%, transparent)",
    color: "var(--color-rarity-rare)",
    border: "1px solid color-mix(in srgb, var(--color-rarity-rare) 30%, transparent)",
  },
  EPIC: {
    backgroundColor: "color-mix(in srgb, var(--color-rarity-epic) 15%, transparent)",
    color: "var(--color-rarity-epic)",
    border: "1px solid color-mix(in srgb, var(--color-rarity-epic) 30%, transparent)",
  },
  LEGENDARY: {
    backgroundColor: "color-mix(in srgb, var(--color-rarity-legendary) 15%, transparent)",
    color: "var(--color-rarity-legendary)",
    border: "1px solid color-mix(in srgb, var(--color-rarity-legendary) 30%, transparent)",
  },
};

interface RarityBadgeProps extends VariantProps<typeof rarityBadgeVariants> {
  rarity: BadgeRarity;
  /** Render a color dot before the label */
  showDot?: boolean;
  className?: string;
}

export function RarityBadge({ rarity, showDot = false, className }: RarityBadgeProps) {
  return (
    <span className={cn(rarityBadgeVariants({ rarity }), className)} style={RARITY_STYLES[rarity]}>
      {showDot && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: "currentColor" }}
          aria-hidden="true"
        />
      )}
      {BADGE_RARITY_LABELS[rarity]}
    </span>
  );
}
