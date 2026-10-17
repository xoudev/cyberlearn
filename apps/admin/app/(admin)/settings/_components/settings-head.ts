import type { Crumb } from "../../_components/admin-ui";

/**
 * What the settings and their loading state share: the header and the titles
 * of the three cards. Written once here, so the skeleton cannot drift from the
 * page it stands in for.
 */

export const SETTINGS_HEADER = {
  crumbs: [{ label: "Système" }] as const satisfies readonly [Crumb],
  title: "Paramètres",
  description:
    "Configuration du runtime, variables d'environnement et volumétrie de la base de données.",
};

export const SETTINGS_CARDS = {
  env: "Variables d'environnement",
  database: "Base de données",
  platform: "Informations plateforme",
} as const;
