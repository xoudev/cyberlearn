import type { Crumb } from "../../_components/admin-ui";
import type { GridColumn } from "../../_components/data-grid";

/**
 * What the announcements page and its loading state share, written once so
 * the skeleton cannot drift from the page it stands in for.
 */

export const ANNOUNCEMENTS_HEADER = {
  crumbs: [{ label: "Support" }] as const satisfies readonly [Crumb],
  title: "Annonces",
  description:
    "Une notification envoyée d'un coup à tous les comptes, à un rôle ou à des classes. Elle arrive dans la cloche du site et dans l'app, ne s'annule pas, et chaque envoi est tracé dans l'audit log.",
};

export const HISTORY_PAGE_SIZE = 20;

export const HISTORY_COLUMNS: readonly GridColumn[] = [
  { label: "Annonce" },
  { label: "Destinataires" },
  { label: "Lien" },
  { label: "Envoyée par" },
  { label: "Date", align: "right" },
];
