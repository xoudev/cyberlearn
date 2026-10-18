import type { Crumb } from "../../_components/admin-ui";
import type { GridColumn } from "../../_components/data-grid";

/**
 * What the ticket pages and their loading states share: the headers, the
 * figures, the columns of the queue and the cards of a ticket. Written once
 * here, so a skeleton cannot drift from the page it stands in for.
 */

export const TICKETS_HEADER = {
  crumbs: [{ label: "Support" }] as const satisfies readonly [Crumb],
  title: "Tickets",
  description:
    "Signalements du formulaire de contact. Les bugs et alertes sécurité ouverts ou en cours sont considérés critiques. Un ticket en cours dont le demandeur a répondu remonte en tête, marqué « Réponse en attente ».",
};

/** The trail of a ticket, back to the queue. */
export const TICKET_CRUMBS = [
  { label: "Support" },
  { label: "Tickets", href: "/tickets" },
] as const satisfies readonly [Crumb, Crumb];

export const TICKET_KPI_LABELS = [
  "Ouverts",
  "En cours",
  "Résolus / fermés",
  "Critiques actifs",
] as const;

/** The queue sorts in the browser, on each row's raw values. */
export const TICKET_COLUMNS: readonly GridColumn[] = [
  { label: "Sujet", sortable: true },
  { label: "Thème", sortable: true },
  { label: "Utilisateur", sortable: true },
  { label: "Assigné à", sortable: true },
  { label: "Jira" },
  { label: "Date", sortable: true },
  { label: "Statut", sortable: true },
];

/**
 * A ticket's cards: the message beside its status, the team's notes and the
 * details, the conversation under them. An appeal adds the ban it contests
 * under the message, which a skeleton cannot know about before the read.
 */
export const TICKET_CARDS = {
  message: "Message",
  appealedBan: "Bannissement contesté",
  status: "Statut",
  notes: "Notes internes",
  details: "Détails",
  conversation: "Conversation",
} as const;
