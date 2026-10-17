import type { Crumb } from "../../_components/admin-ui";
import type { GridColumn } from "../../_components/data-grid";

/**
 * What the overview and its loading state share: the header, the figures,
 * the cards and the columns of the newest accounts. Written once here, so the
 * skeleton cannot drift from the page it stands in for.
 */

export const DASHBOARD_HEADER = {
  crumbs: [{ label: "Aperçu" }] as const satisfies readonly [Crumb],
  title: "Vue d'ensemble",
  description:
    "Croissance, contenu publié et signalements : l'état de la plateforme sur les 8 dernières semaines.",
};

export const DASHBOARD_KPI_LABELS = [
  "Utilisateurs",
  "Leçons publiées",
  "Certificats émis",
  "Tickets actifs",
] as const;

/** The cards under the figures: errors first, then the split of activity and accounts. */
export const DASHBOARD_CARDS = {
  errors: "Erreurs · 24 h",
  activity: "Activité récente",
  newUsers: "Nouveaux utilisateurs",
  content: "Contenu",
} as const;

export const RECENT_USER_COLUMNS: readonly GridColumn[] = [
  { label: "Utilisateur" },
  { label: "Rôle" },
  { label: "Niveau", align: "right" },
  { label: "Inscrit", align: "right" },
];
