import type { Crumb } from "../../_components/admin-ui";

/**
 * What the bench and its loading state share: the header and the titles of
 * its three cards. Written once here, so the skeleton cannot drift from the
 * page it stands in for.
 */

export const LAB_HEADER = {
  crumbs: [{ label: "Outils" }] as const satisfies readonly [Crumb],
  title: "Banc d'essai",
  description:
    "Voir ce qui ne se montre qu'une fois par an, ou qu'une fois envoyé. Rien ici n'écrit, n'envoie ni ne modifie quoi que ce soit.",
};

export const LAB_CARDS = {
  wrapped: "Wrapped",
  moderation: "Filtre de modération",
  emails: "Modèles d'e-mail",
} as const;
