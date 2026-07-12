// Enum unions + label/colour maps mirrored from the Prisma schema, so the mobile
// app never imports @cyberlearn/db (Prisma / server-only). Tables are snake_case,
// columns camelCase - keep that in mind for every supabase query.
import { category as categoryColor, rarity as rarityColor } from "@cyberlearn/tokens";

export type Category = "DEV" | "CYBERSEC" | "NETWORK";
export type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
export type ProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type Rarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

export const CATEGORY_LABEL: Record<Category, string> = {
  DEV: "Dev",
  CYBERSEC: "Cybersec",
  NETWORK: "Réseau",
};

export const CATEGORY_COLOR: Record<Category, string> = {
  DEV: categoryColor.DEV,
  CYBERSEC: categoryColor.CYBERSEC,
  NETWORK: categoryColor.NETWORK,
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  BEGINNER: "Débutant",
  INTERMEDIATE: "Intermédiaire",
  ADVANCED: "Avancé",
  EXPERT: "Expert",
};

export const RARITY_COLOR: Record<Rarity, string> = {
  COMMON: rarityColor.COMMON,
  RARE: rarityColor.RARE,
  EPIC: rarityColor.EPIC,
  LEGENDARY: rarityColor.LEGENDARY,
};

export const CATEGORY_ORDER: Category[] = ["CYBERSEC", "DEV", "NETWORK"];
export const DIFFICULTY_ORDER: Difficulty[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];
