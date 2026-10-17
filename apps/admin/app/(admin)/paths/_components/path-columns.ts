import type { Crumb } from "../../_components/admin-ui";
import type { GridColumn, GridFacet } from "../../_components/data-grid";
import type { FormRow } from "../../_components/page-skeletons";
import type { PathFolder, PathListRow } from "@/lib/services/path-list.service";

/**
 * What the path pages and their loading states share: the headers, the
 * columns and filters of both lists, and the shape of the path form. Written
 * once here, so a skeleton cannot drift from the page it stands in for.
 */

export const PATHS_HEADER = {
  crumbs: [{ label: "Contenu" }] as const satisfies readonly [Crumb],
  title: "Parcours",
};

/** The trail of the pages under the list, back to it. */
export const PATH_CRUMBS = [
  { label: "Contenu" },
  { label: "Parcours", href: "/paths" },
] as const satisfies readonly [Crumb, Crumb];

/** The archives' header, which its loading state shows without the count. */
export const PATH_ARCHIVES_HEADER = {
  crumbs: PATH_CRUMBS,
  title: "Parcours archivés",
  description:
    "Invisibles sur le site et dans l'app. Les progressions et les certificats déjà délivrés sont conservés. Change le statut d'un parcours pour le remettre en brouillon : il retourne dans la liste des parcours.",
};

export const NEW_PATH_HEADER = {
  crumbs: PATH_CRUMBS,
  title: "Créer un parcours",
};

/** A path's final quiz. Its trail ends on the path itself, read with the page. */
export const PATH_QUIZ_HEADER = {
  title: "Quiz final",
  description: "Il conditionne l'émission du certificat de ce parcours.",
};

export const CAT_LABEL: Record<string, string> = {
  DEV: "Développement",
  CYBERSEC: "Cybersécurité",
  NETWORK: "Réseau",
};

export const ORIGIN_LABEL: Record<PathListRow["origin"], string> = {
  new: "Nouveau catalogue",
  first: "Ancien catalogue",
  class: "Parcours de classe",
};

/** Both lists sort in the browser, on each row's raw values. */
export const PATH_COLUMNS: readonly GridColumn[] = [
  { label: "Parcours", sortable: true },
  { label: "Catégorie", sortable: true },
  { label: "Difficulté", sortable: true },
  { label: "Leçons", align: "right", sortable: true },
  { label: "Complétions", align: "right", sortable: true },
  { label: "Certifs", align: "right", sortable: true },
  { label: "Note", align: "right", sortable: true },
  { label: "Statut", sortable: true },
  { label: "Actions" },
];

/** The filters of a folder. The archives hold one status, so they have no status filter. */
export function pathFacets(folder: PathFolder): GridFacet[] {
  const facets: GridFacet[] = [
    {
      label: "Catégorie",
      options: Object.entries(CAT_LABEL).map(([value, label]) => ({ value, label })),
    },
    {
      label: "Catalogue",
      options: Object.entries(ORIGIN_LABEL).map(([value, label]) => ({ value, label })),
    },
  ];
  if (folder === "active") {
    facets.push({
      label: "Statut",
      options: [
        { value: "PUBLISHED", label: "Publié" },
        { value: "DRAFT", label: "Brouillon" },
      ],
    });
  }
  return facets;
}

/** How many filters a folder's toolbar holds, for its skeleton. */
export function pathFacetCount(folder: PathFolder): number {
  return pathFacets(folder).length;
}

/**
 * The shape of the path form, for the loading states of the pages that hold
 * it: reference and slug, title, description, category and track, difficulty
 * and hours, the cover, the lessons it strings together.
 */
export const PATH_FORM_ROWS: readonly FormRow[] = [
  2,
  1,
  { height: 90 },
  2,
  2,
  { height: 120 },
  { height: 360 },
];
