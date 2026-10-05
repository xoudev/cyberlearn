// Enum unions + label/colour maps mirrored from the Prisma schema, so the mobile
// app never imports @cyberlearn/db (Prisma / server-only). Tables are snake_case,
// columns camelCase - keep that in mind for every supabase query.
import { rarity as rarityColor } from "@cyberlearn/tokens";
import {
  CATEGORY_META,
  DIFFICULTY_META,
  type ContentCategory,
  type ContentDifficulty,
} from "@cyberlearn/lib/content/vocabulary";

export type Category = ContentCategory;
export type Difficulty = ContentDifficulty;
export type ProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type Rarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

// The words and colours are the site's (packages/lib, content/vocabulary).
export const CATEGORY_LABEL: Record<Category, string> = {
  DEV: CATEGORY_META.DEV.short,
  CYBERSEC: CATEGORY_META.CYBERSEC.short,
  NETWORK: CATEGORY_META.NETWORK.short,
};

export const CATEGORY_COLOR: Record<Category, string> = {
  DEV: CATEGORY_META.DEV.color,
  CYBERSEC: CATEGORY_META.CYBERSEC.color,
  NETWORK: CATEGORY_META.NETWORK.color,
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  BEGINNER: DIFFICULTY_META.BEGINNER.label,
  INTERMEDIATE: DIFFICULTY_META.INTERMEDIATE.label,
  ADVANCED: DIFFICULTY_META.ADVANCED.label,
  EXPERT: DIFFICULTY_META.EXPERT.label,
};

export const RARITY_COLOR: Record<Rarity, string> = {
  COMMON: rarityColor.COMMON,
  RARE: rarityColor.RARE,
  EPIC: rarityColor.EPIC,
  LEGENDARY: rarityColor.LEGENDARY,
};

export { CATEGORY_ORDER, DIFFICULTY_ORDER } from "@cyberlearn/lib/content/vocabulary";
