import type { Crumb } from "../../_components/admin-ui";
import type { GridColumn } from "../../_components/data-grid";

/**
 * What the audit log and its loading state share: the header, the filters'
 * labels and the columns. Written once here, so the skeleton cannot drift
 * from the page it stands in for.
 */

export const AUDIT_HEADER = {
  crumbs: [{ label: "Système" }] as const satisfies readonly [Crumb],
  title: "Audit log",
};

/** The filters above the log, in the order the toolbar draws them. */
export const AUDIT_FILTER_LABELS = {
  actor: "Acteur",
  target: "Cible",
  action: "Action",
  from: "Du",
  to: "Au",
  crons: "Tâches planifiées",
} as const;

/** Only the date sorts: the log is read newest or oldest first. */
export const AUDIT_COLUMNS: readonly GridColumn[] = [
  { label: "Action" },
  { label: "Acteur" },
  { label: "Cible" },
  { label: "Métadonnées" },
  { label: "Horodatage", sortKey: "date" },
];
