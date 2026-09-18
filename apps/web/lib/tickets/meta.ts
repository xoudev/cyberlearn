/**
 * How a ticket's theme and status read to the person who opened it.
 *
 * The console has its own copy of these labels in its own visual language. They
 * are two audiences and two vocabularies: "Feature request" is fine in a queue
 * an administrator reads, and the person waiting on an answer is better served
 * by "Suggestion". What must not diverge is the set of keys, which the types
 * below hold to the enum.
 */

import type { TicketStatus, TicketTheme } from "@cyberlearn/db";

export const THEME_LABEL: Record<TicketTheme, string> = {
  BUG: "Bug",
  QUESTION: "Question",
  FEATURE_REQUEST: "Suggestion",
  SECURITY: "Sécurité",
  CONTENT_ERROR: "Erreur dans un contenu",
  ESTABLISHMENT_REQUEST: "Ajout d'un établissement",
  BAN_APPEAL: "Appel d'un bannissement",
  OTHER: "Autre",
};

export const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Reçu",
  IN_PROGRESS: "En traitement",
  RESOLVED: "Résolu",
  CLOSED: "Clos",
};

/** Which of the four gets the accent, the warning colour, or neither. */
export const STATUS_TONE: Record<TicketStatus, "accent" | "warning" | "muted"> = {
  OPEN: "warning",
  IN_PROGRESS: "warning",
  RESOLVED: "accent",
  CLOSED: "muted",
};
