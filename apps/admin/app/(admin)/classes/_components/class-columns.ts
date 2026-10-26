import type { Crumb } from "../../_components/admin-ui";
import type { GridColumn } from "../../_components/data-grid";

/**
 * What the class pages and their loading states share: the headers, the
 * figures and the columns of the list. Written once here, so a skeleton cannot
 * drift from the page it stands in for.
 */

export const CLASSES_HEADER = {
  crumbs: [{ label: "Structure" }] as const satisfies readonly [Crumb],
  title: "Classes",
  description:
    "Une classe appartient à une promo, qui appartient à un établissement. Ouvre une classe pour gérer ses élèves et ses professeurs.",
};

/** The trail of the pages under the list, back to it. */
export const CLASS_CRUMBS = [
  { label: "Structure" },
  { label: "Classes", href: "/classes" },
] as const satisfies readonly [Crumb, Crumb];

export const NEW_CLASS_HEADER = {
  crumbs: CLASS_CRUMBS,
  title: "Créer",
  description:
    "Un établissement contient des promos, une promo contient des classes. Crée-les dans cet ordre - chaque niveau a besoin du précédent.",
};

export const STRUCTURE_HEADER = {
  crumbs: CLASS_CRUMBS,
  title: "Établissements et promos",
  description:
    "Renommer, corriger un slug, archiver une année. Archiver un établissement retire aussi ses promos et ses classes, sans toucher à leur propre état.",
};

export const CLASS_KPI_LABELS = [
  "Établissements",
  "Promos",
  "Classes",
  "Élèves rattachés",
] as const;

export const STRUCTURE_KPI_LABELS = [
  "Établissements actifs",
  "Promos actives",
  "Classes rattachées",
  "Archivés",
] as const;

/** The list sorts in the browser, on each row's raw values. */
export const CLASS_COLUMNS: readonly GridColumn[] = [
  { label: "Classe", sortable: true },
  { label: "Établissement", sortable: true },
  { label: "Promo", sortable: true },
  { label: "Élèves", align: "right", sortable: true },
  { label: "Professeurs", sortable: true },
  { label: "État", sortable: true },
];
