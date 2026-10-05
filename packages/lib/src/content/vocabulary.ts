import { category as categoryColor, difficulty as difficultyColor } from "@cyberlearn/tokens";

/**
 * What a category and a difficulty are called, and what colour they wear.
 *
 * Twenty files wrote their own version of these two tables, each a little
 * differently: "Réseau" here and "Réseaux" there, "Cybersec" on one page and
 * "Cybersécurité" on the next, "Débutant" on the site and "Facile" on the
 * challenges, a Cybersec that was pink on the revisions page and red
 * everywhere else. This is the one table, read by the site, the shared
 * components and the app. The colours come from the tokens package, which is
 * where the app already read them.
 */
export type ContentCategory = "CYBERSEC" | "DEV" | "NETWORK";
export type ContentDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

export interface CategoryMeta {
  /** The full name: "Cybersécurité". */
  label: string;
  /** The name on a chip, where the full one would not fit: "Cybersec". */
  short: string;
  /** The name in a URL or a file path: "cybersec". */
  slug: string;
  color: string;
}

export interface DifficultyMeta {
  label: string;
  /** 1 to 4, the number of bars a difficulty gauge lights. */
  level: 1 | 2 | 3 | 4;
  color: string;
}

export const CATEGORY_ORDER: readonly ContentCategory[] = ["CYBERSEC", "DEV", "NETWORK"];
export const DIFFICULTY_ORDER: readonly ContentDifficulty[] = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
];

export const CATEGORY_META: Record<ContentCategory, CategoryMeta> = {
  CYBERSEC: {
    label: "Cybersécurité",
    short: "Cybersec",
    slug: "cybersec",
    color: categoryColor.CYBERSEC,
  },
  DEV: { label: "Développement", short: "Dev", slug: "dev", color: categoryColor.DEV },
  NETWORK: { label: "Réseau", short: "Réseau", slug: "network", color: categoryColor.NETWORK },
};

export const DIFFICULTY_META: Record<ContentDifficulty, DifficultyMeta> = {
  BEGINNER: { label: "Débutant", level: 1, color: difficultyColor.BEGINNER },
  INTERMEDIATE: { label: "Intermédiaire", level: 2, color: difficultyColor.INTERMEDIATE },
  ADVANCED: { label: "Avancé", level: 3, color: difficultyColor.ADVANCED },
  EXPERT: { label: "Expert", level: 4, color: difficultyColor.EXPERT },
};

export function isContentCategory(value: string): value is ContentCategory {
  return value in CATEGORY_META;
}

export function isContentDifficulty(value: string): value is ContentDifficulty {
  return value in DIFFICULTY_META;
}

/** Grey, for a value the table does not know: the word itself, as it came. */
const NEUTRAL = "#B8B5D1";

/** The table's row, or a grey row that says the value as it came. */
export function categoryMeta(value: string): CategoryMeta {
  return isContentCategory(value)
    ? CATEGORY_META[value]
    : { label: value, short: value, slug: value.toLowerCase(), color: NEUTRAL };
}

export function difficultyMeta(value: string): DifficultyMeta {
  return isContentDifficulty(value)
    ? DIFFICULTY_META[value]
    : { label: value, level: 1, color: NEUTRAL };
}
