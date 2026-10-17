import type { Crumb } from "../../_components/admin-ui";

/**
 * What the tournament pages and their loading states share: the headers and
 * the titles of the form's cards. Written once here, so a skeleton cannot
 * drift from the page it stands in for.
 */

export const TOURNAMENTS_HEADER = {
  crumbs: [{ label: "Gamification" }] as const satisfies readonly [Crumb],
  title: "Tournois",
  description:
    "Des défis à flag ouverts sur une période, entre classes ou entre écoles, avec un tableau des scores en direct sur le site et dans l'app.",
};

/** The trail of a tournament's own pages, back to the list. */
export const TOURNAMENT_CRUMBS = [
  { label: "Gamification" },
  { label: "Tournois", href: "/tournaments" },
] as const satisfies readonly [Crumb, Crumb];

export const NEW_TOURNAMENT_HEADER = {
  crumbs: TOURNAMENT_CRUMBS,
  title: "Nouveau tournoi",
  description:
    "Les élèves des classes choisies reçoivent une notification dès l'enregistrement ; les défis restent cachés jusqu'au début.",
};

/** The form's three cards, in its order. */
export const TOURNAMENT_FORM_CARDS = {
  tournament: "Le tournoi",
  teams: "Les équipes",
  challenges: "Les défis",
} as const;
