import type { Crumb } from "../../_components/admin-ui";
import type { GridColumn } from "../../_components/data-grid";

/**
 * What the usage page and its loading state share: the header, the figures
 * and the columns of its two tables. Written once here, so the skeleton
 * cannot drift from the page it stands in for.
 */

export const USAGE_HEADER = {
  crumbs: [{ label: "Aperçu", href: "/dashboard" }] as const satisfies readonly [Crumb],
  title: "Mesures d'usage",
  description:
    "Qui apprend vraiment, si les nouveaux inscrits reviennent, et où les leçons perdent leurs lecteurs. Un compte est actif un jour où il a terminé une leçon, résolu un défi ou fait son rappel du jour : ouvrir le site ne suffit pas. Les jours sont ceux de Paris.",
};

export const USAGE_KPI_LABELS = [
  "Actifs aujourd'hui",
  "Actifs sur 7 jours",
  "Actifs sur 30 jours",
  "Comptes",
] as const;

export const USAGE_CARDS = {
  cohorts: "Inscriptions, semaine par semaine",
  lessons: "Leçons où l'on décroche",
} as const;

export const COHORT_COLUMNS: readonly GridColumn[] = [
  { label: "Semaine du" },
  { label: "Inscrits", align: "right" },
  { label: "Profil terminé", align: "right" },
  { label: "Une leçon terminée", align: "right" },
  { label: "Revenus en 2e semaine", align: "right" },
];

export const STALLED_COLUMNS: readonly GridColumn[] = [
  { label: "Leçon" },
  { label: "Ouverte par", align: "right" },
  { label: "Terminée", align: "right" },
  { label: "Laissée en plan", align: "right" },
];
