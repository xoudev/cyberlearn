import type {
  Category,
  ConsoleLessonFolder,
  ConsoleLessonOrigin,
  Difficulty,
} from "@cyberlearn/db";
import type { Crumb, Tone } from "../../_components/admin-ui";
import type { GridColumn, ServerGridFacet } from "../../_components/data-grid";
import {
  LESSON_CATEGORY_VALUES,
  LESSON_DIFFICULTY_VALUES,
  LESSON_ORIGIN_VALUES,
  LESSON_STATUS_VALUES,
  type LessonListParams,
} from "@/lib/list-params";

/**
 * What the two lesson lists and their loading states share: the columns, the
 * filters and the words for each value. A plain module, so the server pages
 * and their skeletons read the same values; the client grid gets the columns
 * from the page.
 */

/** The working list's header; the page adds its count to the title. */
export const LESSONS_HEADER = {
  crumbs: [{ label: "Contenu" }] as const satisfies readonly [Crumb],
  title: "Leçons",
};

/** The archives' header, which its loading state shows as it is. */
export const ARCHIVES_HEADER = {
  crumbs: [
    { label: "Contenu" },
    { label: "Leçons", href: "/lessons" },
  ] as const satisfies readonly [Crumb, Crumb],
  title: "Leçons archivées",
  description:
    "Invisibles sur le site et dans l'app. Les progressions et les réponses de ceux qui les ont suivies sont conservées. Une leçon remise en brouillon retourne dans la liste des leçons.",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  DEV: "Développement",
  CYBERSEC: "Cybersécurité",
  NETWORK: "Réseau",
};

export const DIFFICULTY_META: Record<Difficulty, { tone: Tone; label: string }> = {
  BEGINNER: { tone: "accent", label: "Débutant" },
  INTERMEDIATE: { tone: "info", label: "Intermédiaire" },
  ADVANCED: { tone: "purple", label: "Avancé" },
  EXPERT: { tone: "warning", label: "Expert" },
};

export const ORIGIN_LABEL: Record<ConsoleLessonOrigin, string> = {
  new: "Nouveau catalogue",
  first: "Ancien catalogue",
  class: "Leçons de classe",
};

const STATUS_LABEL: Record<(typeof LESSON_STATUS_VALUES)[number], string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publié",
};

/**
 * The columns. A sortKey is the name ?sort= gives the column, one of
 * LESSON_SORT_KEYS; the completions do not sort (see listForConsole).
 */
export const LESSON_COLUMNS: readonly GridColumn[] = [
  { label: "Leçon", sortKey: "title" },
  { label: "Catégorie", sortKey: "category" },
  { label: "Difficulté", sortKey: "difficulty" },
  { label: "XP", align: "right", sortKey: "xp" },
  { label: "Terminées", align: "right" },
  { label: "Note", align: "right", sortKey: "rating" },
  { label: "Statut", align: "right", sortKey: "status" },
  { label: "Supprimer" },
];

/** The filters of a folder, with their current values. The archives hold one status. */
export function lessonFacets(
  folder: ConsoleLessonFolder,
  params: Pick<LessonListParams, "category" | "difficulty" | "status" | "origin">,
): ServerGridFacet[] {
  const facets: ServerGridFacet[] = [
    {
      key: "category",
      label: "Catégorie",
      value: params.category,
      options: LESSON_CATEGORY_VALUES.map((value) => ({ value, label: CATEGORY_LABEL[value] })),
    },
    {
      key: "difficulty",
      label: "Difficulté",
      value: params.difficulty,
      options: LESSON_DIFFICULTY_VALUES.map((value) => ({
        value,
        label: DIFFICULTY_META[value].label,
      })),
    },
  ];
  if (folder === "active") {
    facets.push({
      key: "status",
      label: "Statut",
      value: params.status,
      options: LESSON_STATUS_VALUES.map((value) => ({ value, label: STATUS_LABEL[value] })),
    });
  }
  facets.push({
    key: "origin",
    label: "Catalogue",
    value: params.origin,
    options: LESSON_ORIGIN_VALUES.map((value) => ({ value, label: ORIGIN_LABEL[value] })),
  });
  return facets;
}

/** How many filters a folder's toolbar holds, for its skeleton. */
export function lessonFacetCount(folder: ConsoleLessonFolder): number {
  return folder === "active" ? 4 : 3;
}
