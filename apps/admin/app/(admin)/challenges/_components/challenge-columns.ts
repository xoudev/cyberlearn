import type { Crumb } from "../../_components/admin-ui";
import type { GridColumn } from "../../_components/data-grid";
import type { FormRow } from "../../_components/page-skeletons";

/**
 * What the challenge pages and their loading states share: the headers and
 * the columns of the list. Written once here, so a skeleton cannot drift from
 * the page it stands in for.
 */

export const CHALLENGES_HEADER = {
  crumbs: [{ label: "Gamification" }] as const satisfies readonly [Crumb],
  title: "Challenges",
};

/** The trail of a challenge's own pages, back to the list. */
export const CHALLENGE_CRUMBS = [
  { label: "Gamification" },
  { label: "Challenges", href: "/challenges" },
] as const satisfies readonly [Crumb, Crumb];

export const NEW_CHALLENGE_HEADER = {
  crumbs: CHALLENGE_CRUMBS,
  title: "Nouveau challenge",
};

/** The list sorts in the browser, on each row's raw values. */
export const CHALLENGE_COLUMNS: readonly GridColumn[] = [
  { label: "Ref", sortable: true },
  { label: "Titre", sortable: true },
  { label: "Catégorie", sortable: true },
  { label: "Difficulté", sortable: true },
  { label: "Type", sortable: true },
  { label: "XP", align: "right", sortable: true },
  { label: "Résolus", align: "right", sortable: true },
  { label: "Statut", sortable: true },
  { label: "Actions" },
];

/**
 * The shape of the challenge form, for the loading states of the pages that
 * hold it: reference and slug, title, summary, instructions, the three menus,
 * the four figures, the flag, the two links, the prerequisite.
 */
export const CHALLENGE_FORM_ROWS: readonly FormRow[] = [
  2,
  1,
  { height: 70 },
  { height: 160 },
  3,
  4,
  1,
  2,
  1,
];
