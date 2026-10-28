import type {
  BadgeCriterionType,
  BadgeRarity,
  CosmeticType,
  QuestType,
  SeasonStatus,
} from "@cyberlearn/db";

/**
 * The words the reference lists use for the values they show: plain data, so
 * a page and a test read the same ones.
 */

export const COSMETIC_TYPE_LABEL: Record<CosmeticType, string> = {
  TERMINAL_THEME: "Thème du terminal",
  HEXAGON_STYLE: "Style d'hexagone",
  PROFILE_FRAME: "Cadre de profil",
  ACCENT_COLOR: "Couleur d'accent",
};

/** The site's rarity ramp, as the badges list shows it. */
export const RARITY_META: Record<BadgeRarity, { color: string; label: string }> = {
  COMMON: { color: "var(--a-rarity-common)", label: "Commun" },
  RARE: { color: "var(--a-rarity-rare)", label: "Rare" },
  EPIC: { color: "var(--a-rarity-epic)", label: "Épique" },
  LEGENDARY: { color: "var(--a-rarity-legendary)", label: "Légendaire" },
};

export const QUEST_TYPE_LABEL: Record<QuestType, string> = {
  LESSON_COMPLETED: "Leçons terminées",
  PERFECT_QUIZ: "Quiz sans faute",
  STREAK_DAYS: "Jours de série",
  FORUM_POST: "Messages d'entraide",
  WEEKLY_BONUS: "Bonus de la semaine",
  CHALLENGE_SOLVED: "Défis résolus",
  DAILY_RECALL: "Rappels du jour",
  EXERCISE_PASSED: "Exercices réussis",
};

export const SEASON_STATUS_META: Record<
  SeasonStatus,
  { label: string; tone: "accent" | "warning" | "neutral" }
> = {
  ACTIVE: { label: "En cours", tone: "accent" },
  CLOSING: { label: "En clôture", tone: "warning" },
  CLOSED: { label: "Close", tone: "neutral" },
};

const CRITERION_LABEL: Record<BadgeCriterionType, string> = {
  LESSON_COMPLETED: "Leçons terminées",
  PATH_COMPLETED: "Parcours terminé",
  XP_THRESHOLD: "Seuil d'XP",
  STREAK_DAYS: "Jours de série",
  CATEGORY_MASTERY: "Maîtrise d'un domaine",
  PERFECT_QUIZ: "Quiz sans faute",
  CUSTOM: "Personnalisé",
  LESSON_SPECIFIC: "Leçon précise",
  LEVEL: "Niveau",
  BADGE_EARNED: "Badge obtenu",
  CHALLENGES_SOLVED: "Défis résolus",
  DUELS_PLAYED: "Duels joués",
  DUELS_WON: "Duels gagnés",
  TOURNAMENTS_PLAYED: "Tournois joués",
  TOURNAMENT_RANK: "Place en tournoi",
  DAILY_RECALLS: "Rappels du jour",
};

function field(data: unknown, key: string): string | number | null {
  if (data === null || typeof data !== "object" || Array.isArray(data)) return null;
  const value: unknown = Object.getOwnPropertyDescriptor(data, key)?.value;
  return typeof value === "string" || typeof value === "number" ? value : null;
}

/**
 * What unlocks a cosmetic, in words: "Niveau 5", "Badge CL-BDG-009". The two
 * kinds the seed writes are read; any other says its kind and leaves the
 * detail to the JSON, rather than guessing at a shape.
 */
export function criterionText(type: BadgeCriterionType, data: unknown): string {
  if (type === "LEVEL") {
    const level = field(data, "level");
    if (level !== null) return `Niveau ${String(level)}`;
  }
  if (type === "BADGE_EARNED") {
    const badge = field(data, "badgeRefCode");
    if (badge !== null) return `Badge ${String(badge)}`;
  }
  return CRITERION_LABEL[type];
}

/** A placement question's options, as the seed writes them: [{ id, text }]. */
export function placementOptions(options: unknown): { id: string; text: string }[] {
  if (!Array.isArray(options)) return [];
  return options.flatMap((option: unknown) => {
    const id = field(option, "id");
    const text = field(option, "text");
    return id === null || text === null ? [] : [{ id: String(id), text: String(text) }];
  });
}
