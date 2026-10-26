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

export const CONTENT_HEADER = {
  crumbs: [
    { label: "Sécurité" },
    { label: "Modération", href: "/moderation" },
  ] as const satisfies readonly [Crumb, Crumb],
  title: "Contenus publiés",
  description:
    "Ce que les apprenants publient pour les autres : messages du forum, questions et réponses sous les leçons, solutions des défis, ressources de classe. Masquer retire le contenu de la vue des autres, Réafficher le rend, Supprimer l'efface pour de bon. Chaque geste prévient l'auteur et s'inscrit dans l'audit log.",
};

export const REPORTS_HEADER = {
  crumbs: [
    { label: "Sécurité" },
    { label: "Modération", href: "/moderation" },
  ] as const satisfies readonly [Crumb, Crumb],
  title: "Signalements",
  description:
    "Les contenus que des apprenants ont signalés, les plus signalés d'abord. Rien n'est retiré tant que personne ici ne l'a relu : masquer ou supprimer classe leurs signalements, « Classer sans suite » les ferme et laisse le contenu en place.",
};
