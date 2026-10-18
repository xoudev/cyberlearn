import type { Crumb } from "../../_components/admin-ui";

/**
 * What « Mon compte » and its loading state share: the header and the titles
 * of its cards. Written once here, so the skeleton cannot drift from the page.
 */

export const ACCOUNT_HEADER = {
  crumbs: [{ label: "Compte" }] as const satisfies readonly [Crumb],
  title: "Mon compte",
  description:
    "Ton propre compte d'administrateur : qui la console sait que tu es, comment tu te connectes, ce que tu as fait, et tes sessions.",
};

export const ACCOUNT_CARDS = {
  identity: "Identité",
  signIn: "Connexion",
  actions: "Mes actions",
  sessions: "Sessions",
} as const;
