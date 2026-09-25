import {
  TICKET_THEME_LABEL,
  type TicketStatusKey,
  type TicketThemeKey,
} from "@cyberlearn/lib/tickets/tickets";

/**
 * Help requests as the app receives them from /api/mobile/support/*. Whether a
 * request still takes a reply is the repository's rule, sent as
 * `acceptsReplies`; these helpers only word what the screens show, as the
 * site's /support does.
 */

export interface SupportTicketSummary {
  id: string;
  subject: string;
  theme: TicketThemeKey;
  status: TicketStatusKey;
  createdAt: string;
  updatedAt: string;
  replies: number;
}

export interface SupportMessage {
  id: string;
  body: string;
  fromStaff: boolean;
  createdAt: string;
  /** Only for the team's turns; the requester's own read "Toi". */
  authorName: string | null;
}

export interface SupportThread {
  id: string;
  subject: string;
  theme: TicketThemeKey;
  status: TicketStatusKey;
  message: string;
  createdAt: string;
  acceptsReplies: boolean;
  messages: SupportMessage[];
}

const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
const STAMP = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** "Bug · envoyée le 20 septembre · 2 réponses", as the site's list says it. */
export function ticketListMeta(ticket: SupportTicketSummary): string {
  const replies =
    ticket.replies > 0
      ? ` · ${String(ticket.replies)} réponse${ticket.replies > 1 ? "s" : ""}`
      : "";
  return `${TICKET_THEME_LABEL[ticket.theme]} · envoyée le ${DAY.format(new Date(ticket.createdAt))}${replies}`;
}

/** Who spoke, and when: "Toi · …" or the team member's name. */
export function speakerLine(
  message: Pick<SupportMessage, "fromStaff" | "authorName" | "createdAt">,
): string {
  const who = message.fromStaff ? (message.authorName ?? "Équipe CyberLearn") : "Toi";
  return `${who} · ${STAMP.format(new Date(message.createdAt))}`;
}

/** Why the reply box is gone, in the site's words. */
export function closedNotice(status: TicketStatusKey): string {
  return `Cette demande est ${status === "RESOLVED" ? "résolue" : "close"}. Si le problème revient, ouvre-en une nouvelle.`;
}
