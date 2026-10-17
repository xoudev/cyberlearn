import type { Crumb } from "../../_components/admin-ui";
import type { GridColumn } from "../../_components/data-grid";

/**
 * What the account list and its loading state share: the header, the figures
 * and the columns of both lists. Written once here, so the skeleton cannot
 * drift from the page it stands in for.
 */

export const USERS_HEADER = {
  crumbs: [{ label: "Comptes" }] as const satisfies readonly [Crumb],
  title: "Utilisateurs",
  description:
    "Recherche, tri et gestion des rôles. Un changement de rôle se confirme et est tracé dans l'audit log ; personne ne peut retirer son propre rôle Admin ni celui du dernier administrateur.",
};

/** The trail of an account's own page, back to the list. */
export const USER_CRUMBS = [
  { label: "Comptes" },
  { label: "Utilisateurs", href: "/users" },
] as const satisfies readonly [Crumb, Crumb];

/** The figures of one account, above its cards. */
export const USER_DETAIL_KPI_LABELS = ["Niveau", "XP", "Série", "Badges"] as const;

/**
 * The cards of an account's page whose title does not depend on the account.
 * The others carry a count (tickets, certificates, classes) or a state (a ban
 * in force), and wait as a block in the skeleton.
 */
export const USER_CARDS = {
  account: "Compte",
  signIn: "Connexion",
  profile: "Profil",
  progress: "Progression",
  moderation: "Modération",
  audit: "Journal d'audit",
  preferences: "Préférences",
  resetProgress: "Remettre la progression à zéro",
  danger: "Zone dangereuse",
} as const;

export const USER_KPI_LABELS = [
  "Total",
  "Administrateurs",
  "Actifs sur 7 jours",
  "Taux d'activité",
] as const;

/**
 * The accounts. A sortKey is the name ?sort= gives the column, one of
 * USER_SORT_KEYS; the certificates do not sort (see consoleUserOrder).
 */
export const USER_COLUMNS: readonly GridColumn[] = [
  { label: "Utilisateur", sortKey: "user" },
  { label: "Email", sortKey: "email" },
  { label: "Rôle", sortKey: "role" },
  { label: "Niveau", align: "right", sortKey: "level" },
  { label: "XP", align: "right", sortKey: "xp" },
  { label: "Streak", align: "right", sortKey: "streak" },
  { label: "Badges", align: "right", sortKey: "badges" },
  { label: "Certifs", align: "right" },
  { label: "Inscrit", align: "right", sortKey: "created" },
  { label: "Actif", align: "right", sortKey: "active" },
];

/** The sign-ups that never confirmed their address, newest first. */
export const PENDING_COLUMNS: readonly GridColumn[] = [
  { label: "Adresse" },
  { label: "Méthode" },
  { label: "Inscrit", align: "right" },
  { label: "Dernier envoi", align: "right" },
  { label: "Actions" },
];
