import type { Crumb } from "../../_components/admin-ui";

/**
 * What the moderation pages and their loading states share: the headers and
 * the figures of the queue. Written once here, so a skeleton cannot drift
 * from the page it stands in for.
 */

export const MODERATION_HEADER = {
  crumbs: [{ label: "Sécurité" }] as const satisfies readonly [Crumb],
  title: "Modération",
  description:
    "Ce que le filtre automatique a refusé ou signalé. Confirmer ou infirmer ne republie rien : ça dit si la règle est bonne.",
};

export const MODERATION_KPI_LABELS = [
  "En attente",
  "Décisions confirmées",
  "Faux positifs",
  "Taux de faux positifs",
] as const;

export const NOTES_HEADER = {
  crumbs: [
    { label: "Sécurité" },
    { label: "Modération", href: "/moderation" },
  ] as const satisfies readonly [Crumb, Crumb],
  title: "Notes signalées",
};
