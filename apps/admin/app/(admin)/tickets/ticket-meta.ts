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
  return TICKET_STATUSES.some((status) => status === value);
}

export const THEME_META: Record<string, { label: string; tone: Tone }> = {
  BUG: { label: "Bug", tone: "danger" },
  QUESTION: { label: "Question", tone: "info" },
  FEATURE_REQUEST: { label: "Feature request", tone: "info" },
  SECURITY: { label: "Sécurité", tone: "danger" },
  CONTENT_ERROR: { label: "Erreur de contenu", tone: "warning" },
  ESTABLISHMENT_REQUEST: { label: "Demande d'ajout d'établissement", tone: "info" },
  BAN_APPEAL: { label: "Appel d'un bannissement", tone: "danger" },
  OTHER: { label: "Autre", tone: "neutral" },
};

export const STATUS_META: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Ouvert", color: "var(--a-danger)" },
  IN_PROGRESS: { label: "En cours", color: "var(--a-warning)" },
  RESOLVED: { label: "Résolu", color: "var(--a-success)" },
  CLOSED: { label: "Fermé", color: "var(--a-faint)" },
};

/** Whose a ticket is, from where the administrator reading the queue sits. */
export type Assignment = "MINE" | "UNASSIGNED" | "OTHERS";

/**
 * The queue's "Assignation" facet value for one ticket.
 *
 * Relative to the viewer, because that is the question the facet answers:
 * "what is on my plate", and "what is on nobody's". A ticket another
 * administrator holds is neither, and the facet's two options both leave it out.
 */
export function assignmentOf(assigneeId: string | null, viewerId: string): Assignment {
  if (assigneeId === null) return "UNASSIGNED";
  return assigneeId === viewerId ? "MINE" : "OTHERS";
}

/** The options the facet offers. "OTHERS" is not one: it is what both leave out. */
export const ASSIGNMENT_FACET_OPTIONS = [
  { value: "MINE", label: "À moi" },
  { value: "UNASSIGNED", label: "Non assigné" },
] as const satisfies readonly { value: Assignment; label: string }[];

/** How an administrator is named in the console's ticket screens. */
export function adminName(admin: { displayName: string; username: string | null }): string {
  if (admin.displayName.trim() !== "") return admin.displayName;
  return admin.username !== null ? `@${admin.username}` : "Administrateur";
}
