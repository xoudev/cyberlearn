import type { Crumb } from "../../_components/admin-ui";
import type { GridColumn } from "../../_components/data-grid";
import type { FormRow } from "../../_components/page-skeletons";

/**
 * What the badge pages and their loading states share: the headers and the
 * columns of the list. Written once here, so a skeleton cannot drift from the
 * page it stands in for.
 */

export const BADGES_HEADER = {
  crumbs: [{ label: "Gamification" }] as const satisfies readonly [Crumb],
  title: "Badges",
};

/** The trail of a badge's own pages, back to the list. */
export const BADGE_CRUMBS = [
  { label: "Gamification" },
  { label: "Badges", href: "/badges" },
] as const satisfies readonly [Crumb, Crumb];

export const NEW_BADGE_HEADER = {
  crumbs: BADGE_CRUMBS,
  title: "Créer un badge",
};

/** The list sorts in the browser, on each row's raw values. */
export const BADGE_COLUMNS: readonly GridColumn[] = [
  { label: "Ref", sortable: true },
  { label: "Nom", sortable: true },
  { label: "Rareté", sortable: true },
  { label: "Critère", sortable: true },
  { label: "XP", align: "right", sortable: true },
  { label: "Obtenus", align: "right", sortable: true },
  { label: "Statut", sortable: true },
  { label: "Actions" },
];

/**
 * The shape of the badge form, for the loading states of the pages that hold
 * it: reference and name, the description, the icon, rarity and reward, the
 * condition.
 */
export const BADGE_FORM_ROWS: readonly FormRow[] = [2, { height: 90 }, 1, 2, 1];
