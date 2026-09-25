/**
 * How a ticket's theme and status read to the person who opened it. Written
 * once in @cyberlearn/lib/tickets/tickets, which the app reads too; held here to
 * the database's enums, so a theme or a status added there without a label is
 * a type error rather than a blank.
 */

import type { TicketStatus, TicketTheme } from "@cyberlearn/db";
import {
  TICKET_STATUS_LABEL,
  TICKET_STATUS_TONE,
  TICKET_THEME_LABEL,
} from "@cyberlearn/lib/tickets/tickets";

export const THEME_LABEL: Record<TicketTheme, string> = TICKET_THEME_LABEL;
export const STATUS_LABEL: Record<TicketStatus, string> = TICKET_STATUS_LABEL;
export const STATUS_TONE: Record<TicketStatus, "accent" | "warning" | "muted"> = TICKET_STATUS_TONE;
