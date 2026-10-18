import type { Crumb } from "../../_components/admin-ui";
import type { GridColumn } from "../../_components/data-grid";
import type { FormRow } from "../../_components/page-skeletons";

/**
 * What the pages under the lesson list and their loading states share: the
 * trail, the titles, the sync page's figures and the shape of the lesson
 * form. Written once here, so a skeleton cannot drift from the page it stands
 * in for. The lists' own constants are in lesson-columns.ts.
 */

/** The trail of the pages under the list, back to it. */
export const LESSON_CRUMBS = [
  { label: "Contenu" },
  { label: "Leçons", href: "/lessons" },
] as const satisfies readonly [Crumb, Crumb];

export const NEW_LESSON_HEADER = {
  crumbs: LESSON_CRUMBS,
  title: "Créer une leçon",
};

export const IMPORT_HEADER = {
  crumbs: LESSON_CRUMBS,
  title: "Importer une leçon MDX",
  description: "Format : frontmatter YAML + corps MDX · 500 Ko au plus · extension .mdx uniquement",
};

export const REPORTS_HEADER = {
  crumbs: LESSON_CRUMBS,
  title: "Questions signalées",
};

export const SYNC_HEADER = {
  crumbs: LESSON_CRUMBS,
  title: "Synchroniser avec le dépôt",
  description:
    "Les leçons de content/lessons, les parcours de content/paths et leurs examens de content/quizzes, comparés à la base. Rien n'est écrit sans confirmation, et rien n'est publié : les nouvelles leçons et les nouveaux parcours arrivent en brouillon. Le slug, le statut et l'image de couverture d'une leçon existante ne changent jamais.",
};

export const SYNC_KPI_LABELS = [
  "À mettre à jour",
  "Déjà à jour",
  "Pas encore importées",
  "Parcours à synchroniser",
  "Fichiers illisibles",
] as const;

/**
 * Every rating of one lesson, the page its edit page links to under the
 * latest few. Its trail is LESSON_CRUMBS and the lesson's title.
 */
export const LESSON_RATINGS_HEADER = {
  title: "Avis des apprenants",
  description:
    "La note et le commentaire laissés en fin de leçon, du plus récent au plus ancien. Les commentaires ne sont montrés qu'à l'équipe, jamais aux autres apprenants.",
};

export const LESSON_RATING_KPI_LABELS = ["Note moyenne", "Avis"] as const;

export const LESSON_RATING_COLUMNS: readonly GridColumn[] = [
  { label: "Note" },
  { label: "Commentaire" },
  { label: "Apprenant" },
  { label: "Date", align: "right" },
];

/**
 * The shape of the lesson form, for the loading states of the pages that
 * hold it: reference and slug, title, description, category and difficulty,
 * duration and reward, the cover, the editor.
 */
export const LESSON_FORM_ROWS: readonly FormRow[] = [
  2,
  1,
  { height: 90 },
  2,
  2,
  { height: 120 },
  { height: 520 },
];
