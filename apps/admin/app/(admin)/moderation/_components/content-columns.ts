import type { GridColumn } from "../../_components/data-grid";

/**
 * The published-content list's columns, which its grid and its loading
 * state share. Written once here, so the skeleton cannot drift from the page
 * it stands in for.
 */
export const CONTENT_COLUMNS: readonly GridColumn[] = [
  { label: "Contenu" },
  { label: "Auteur" },
  { label: "Publié le", align: "right" },
  { label: "Signalements", align: "right" },
  { label: "État" },
  { label: "Actions" },
];
