import type { Crumb } from "../../_components/admin-ui";
import type { GridColumn } from "../../_components/data-grid";

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

/**
 * A tournament's flags, the page where one is taken back or put back. Its
 * trail is TOURNAMENT_CRUMBS and the tournament it belongs to.
 */
export const TOURNAMENT_SOLVES_HEADER = {
  title: "Flags trouvés",
  description:
    "Un flag disqualifié reste enregistré : le joueur ne peut pas le soumettre de nouveau, et il ne compte plus pour personne, sur le site comme dans l'app. Chaque disqualification et chaque rétablissement est consigné dans l'audit log.",
};

export const SOLVE_KPI_LABELS = ["Flags qui comptent", "Disqualifiés"] as const;

export const SOLVE_COLUMNS: readonly GridColumn[] = [
  { label: "Joueur" },
  { label: "Défi" },
  { label: "Classe" },
  { label: "Points", align: "right" },
  { label: "Trouvé le", align: "right" },
  { label: "Statut" },
  { label: "Actions" },
];

/** The form's three cards, in its order. */
export const TOURNAMENT_FORM_CARDS = {
  tournament: "Le tournoi",
  teams: "Les équipes",
  challenges: "Les défis",
} as const;
