import type { TicketStatus } from "@cyberlearn/db";
import type { Tone } from "../_components/admin-ui";

/** Every status, in the order a ticket goes through them. */
export const TICKET_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
] as const satisfies readonly TicketStatus[];

/**
 * A status read back off a control is a plain string. A guard rather than a
 * cast, so a value that is not one never reaches the action as if it were.
 */
export function isTicketStatus(value: string): value is TicketStatus {
  return (TICKET_STATUSES as readonly string[]).includes(value);
}

export const THEME_META: Record<string, { label: string; tone: Tone }> = {
  BUG: { label: "Bug", tone: "danger" },
  QUESTION: { label: "Question", tone: "info" },
  FEATURE_REQUEST: { label: "Feature request", tone: "purple" },
  SECURITY: { label: "Sécurité", tone: "danger" },
  CONTENT_ERROR: { label: "Erreur de contenu", tone: "warning" },
  ESTABLISHMENT_REQUEST: { label: "Demande d'ajout d'établissement", tone: "info" },
  BAN_APPEAL: { label: "Appel d'un bannissement", tone: "danger" },
  OTHER: { label: "Autre", tone: "neutral" },
};

export const STATUS_META: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Ouvert", color: "var(--a-danger)" },
  IN_PROGRESS: { label: "En cours", color: "var(--a-warning)" },
  RESOLVED: { label: "Résolu", color: "var(--a-accent)" },
  CLOSED: { label: "Fermé", color: "var(--a-faint)" },
};
