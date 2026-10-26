import type { Crumb } from "../../_components/admin-ui";
import type { GridColumn } from "../../_components/data-grid";

/**
 * What the five reference lists and their loading states share: the trail,
 * each list's title and description, its columns, and where its rows come
 * from. Written once here, so a skeleton cannot drift from its page.
 */

const REFERENCE_CRUMBS = [{ label: "Référentiels" }] as const satisfies readonly [Crumb];

export type ReferenceTab = "cosmetics" | "quests" | "seasons" | "forum-categories" | "placement";

/** The tabs, in the order the sidebar's section lists them. */
export const REFERENCE_TABS: readonly { key: ReferenceTab; label: string; href: string }[] = [
  { key: "cosmetics", label: "Cosmétiques", href: "/reference/cosmetics" },
  { key: "quests", label: "Quêtes", href: "/reference/quests" },
  { key: "seasons", label: "Saisons", href: "/reference/seasons" },
  { key: "forum-categories", label: "Forum", href: "/reference/forum-categories" },
  { key: "placement", label: "Positionnement", href: "/reference/placement" },
];

/**
 * Where a list's rows come from, and how to change them: the console reads
 * them and writes nothing, since the next seed or the next migration would
 * undo or contradict an edit made here.
 */
export interface ReferenceSource {
  /** The file that writes the rows, as the repository names it. */
  file: string;
  /** How it writes them, in a sentence that follows "Ces lignes sont". */
  how: string;
  /** How a change reaches the database. */
  change: string;
}

interface ReferenceHeader {
  crumbs: readonly [Crumb];
  title: string;
  description: string;
  source: ReferenceSource;
}

export const COSMETICS_HEADER = {
  crumbs: REFERENCE_CRUMBS,
  title: "Cosmétiques",
  description:
    "Les thèmes, styles d'hexagone, cadres et couleurs d'accent du casier, avec ce qui les débloque et combien de comptes les ont.",
  source: {
    file: "packages/db/prisma/cosmetics.json",
    how: "réécrites par seed-cosmetics.ts à chaque passage du seed, sur leur code",
    change: "Modifie le fichier, puis relance pnpm --filter @cyberlearn/db db:seed.",
  },
} as const satisfies ReferenceHeader;

export const QUESTS_HEADER = {
  crumbs: REFERENCE_CRUMBS,
  title: "Quêtes",
  description:
    "Les quêtes de la semaine affichées sur le tableau de bord : ce qu'elles demandent et ce qu'elles rapportent.",
  source: {
    file: "packages/db/prisma/migrations/20260619000000_weekly_quests/migration.sql",
    how: "insérées par leur migration, sur leur code",
    change: "Une quête nouvelle ou modifiée passe par une nouvelle migration.",
  },
} as const satisfies ReferenceHeader;

export const SEASONS_HEADER = {
  crumbs: REFERENCE_CRUMBS,
  title: "Saisons",
  description:
    "Les saisons de la ligue, la dernière en premier, avec le nombre de joueurs classés dans chacune.",
  source: {
    file: "apps/web/app/api/cron/season-rollover/route.ts",
    how: "ouvertes et closes par la tâche season-rollover chaque nuit ; la toute première l'a été par seed-season.ts",
    change:
      "Rien à faire à la main : une saison échue est close au passage suivant, voir les tâches planifiées.",
  },
} as const satisfies ReferenceHeader;

export const FORUM_CATEGORIES_HEADER = {
  crumbs: REFERENCE_CRUMBS,
  title: "Sections du forum",
  description:
    "Les sections du forum, dans l'ordre du forum, avec le nombre de sujets ouverts dans chacune.",
  source: {
    file: "packages/db/prisma/migrations/20260917020000_forum/migration.sql",
    how: "insérées par la migration du forum, sur leur slug",
    change: "Une section nouvelle ou renommée passe par une nouvelle migration.",
  },
} as const satisfies ReferenceHeader;

export const PLACEMENT_HEADER = {
  crumbs: REFERENCE_CRUMBS,
  title: "Test de positionnement",
  description:
    "Les questions du test proposé à l'inscription, par domaine, avec la bonne réponse et l'explication montrée à la fin.",
  source: {
    file: "packages/db/prisma/seed.ts",
    how: "réécrites par seed.ts à chaque passage du seed",
    change: "Modifie la liste placementQuestions du seed, puis relance le seed.",
  },
} as const satisfies ReferenceHeader;

export const COSMETIC_COLUMNS: readonly GridColumn[] = [
  { label: "Cosmétique" },
  { label: "Emplacement" },
  { label: "Rareté" },
  { label: "Déblocage" },
  { label: "Débloqué par", align: "right" },
  { label: "Statut", align: "right" },
];

export const QUEST_COLUMNS: readonly GridColumn[] = [
  { label: "Quête" },
  { label: "Type" },
  { label: "Objectif", align: "right" },
  { label: "XP", align: "right" },
  { label: "Gels", align: "right" },
  { label: "Statut", align: "right" },
];

export const SEASON_COLUMNS: readonly GridColumn[] = [
  { label: "Saison" },
  { label: "Début" },
  { label: "Fin" },
  { label: "Joueurs", align: "right" },
  { label: "Statut", align: "right" },
];

export const FORUM_CATEGORY_COLUMNS: readonly GridColumn[] = [
  { label: "Section" },
  { label: "Slug" },
  { label: "Position", align: "right" },
  { label: "Sujets", align: "right" },
];

export const PLACEMENT_COLUMNS: readonly GridColumn[] = [
  { label: "Question" },
  { label: "Domaine" },
  { label: "Niveau" },
  { label: "Réponses" },
  { label: "Statut", align: "right" },
];
