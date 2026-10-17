import type { Crumb } from "../../_components/admin-ui";
import type { GridColumn } from "../../_components/data-grid";

/**
 * What the certificate list and its loading state share: the header, the
 * figures and the columns. Written once here, so the skeleton cannot drift
 * from the page it stands in for.
 */

export const CERTIFICATES_HEADER = {
  crumbs: [{ label: "Comptes" }] as const satisfies readonly [Crumb],
  title: "Certificats",
  description:
    "Les certificats émis, valides et révoqués. Une révocation demande un motif : le titulaire est prévenu, la page publique de vérification affiche le motif, et le geste est tracé dans l'audit log, comme un rétablissement.",
};

export const CERTIFICATE_KPI_LABELS = ["Émis", "Valides", "Révoqués", "Émis sur 30 jours"] as const;

/** A sortKey is the name ?sort= gives the column, one of CERTIFICATE_SORT_KEYS. */
export const CERTIFICATE_COLUMNS: readonly GridColumn[] = [
  { label: "Titulaire", sortKey: "holder" },
  { label: "Parcours", sortKey: "path" },
  { label: "Score", align: "right", sortKey: "score" },
  { label: "Émis le", align: "right", sortKey: "issued" },
  { label: "Statut" },
  { label: "Numéro" },
  { label: "Actions" },
];
