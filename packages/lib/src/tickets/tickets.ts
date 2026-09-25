/**
 * Help requests (tickets) as their requester sees them, on the site and in the
 * app: the themes the form offers, the labels, the limits the server applies.
 * Who may write, and whether a ticket still takes a reply, is decided by the
 * repository (ticket.repository); the screens only say it.
 *
 * The console has its own copy of the labels in its own vocabulary: "Feature
 * request" is fine in a queue an administrator reads, and the person waiting on
 * an answer is better served by "Suggestion". What must not diverge is the set
 * of keys, which the site holds to the database enums where it imports these.
 */

export type TicketThemeKey =
  | "BUG"
  | "QUESTION"
  | "FEATURE_REQUEST"
  | "SECURITY"
  | "CONTENT_ERROR"
  | "ESTABLISHMENT_REQUEST"
  | "BAN_APPEAL"
  | "OTHER";

export type TicketStatusKey = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

/** The themes a person may pick. An appeal is filed from the ban notice only. */
export const TICKET_FORM_THEMES = [
  { value: "BUG", label: "Bug" },
  { value: "QUESTION", label: "Question" },
  { value: "FEATURE_REQUEST", label: "Suggestion" },
  { value: "SECURITY", label: "Sécurité" },
  { value: "CONTENT_ERROR", label: "Erreur de contenu" },
  { value: "ESTABLISHMENT_REQUEST", label: "Ajouter mon établissement" },
  { value: "OTHER", label: "Autre" },
] as const satisfies readonly { value: TicketThemeKey; label: string }[];

export type TicketFormTheme = (typeof TICKET_FORM_THEMES)[number]["value"];

/**
 * What an establishment request has to contain to be actionable.
 *
 * It is the one theme with a shape. Without these four, the first reply is
 * always the same four questions and the request waits a round trip for
 * nothing, so they are asked up front instead.
 */
export const ESTABLISHMENT_CHECKLIST = [
  "Le nom exact de l'établissement et sa ville",
  "Les formations ou promotions concernées (BTS SIO 1re année, etc.)",
  "Le nombre d'élèves et de professeurs attendus",
  "Une adresse de contact officielle (direction, référent numérique)",
] as const;

export const TICKET_THEME_LABEL: Record<TicketThemeKey, string> = {
  BUG: "Bug",
  QUESTION: "Question",
  FEATURE_REQUEST: "Suggestion",
  SECURITY: "Sécurité",
  CONTENT_ERROR: "Erreur dans un contenu",
  ESTABLISHMENT_REQUEST: "Ajout d'un établissement",
  BAN_APPEAL: "Appel d'un bannissement",
  OTHER: "Autre",
};

export const TICKET_STATUS_LABEL: Record<TicketStatusKey, string> = {
  OPEN: "Reçu",
  IN_PROGRESS: "En traitement",
  RESOLVED: "Résolu",
  CLOSED: "Clos",
};

/** Which of the four gets the accent, the warning colour, or neither. */
export const TICKET_STATUS_TONE: Record<TicketStatusKey, "accent" | "warning" | "muted"> = {
  OPEN: "warning",
  IN_PROGRESS: "warning",
  RESOLVED: "accent",
  CLOSED: "muted",
};

/** The server's limits (the contact form and the requester's reply). */
export const TICKET_SUBJECT_MIN = 5;
export const TICKET_SUBJECT_MAX = 200;
export const TICKET_MESSAGE_MIN = 20;
export const TICKET_MESSAGE_MAX = 5000;
export const TICKET_REPLY_MIN = 2;
export const TICKET_REPLY_MAX = 5000;

export function isTicketFormTheme(value: string): value is TicketFormTheme {
  return TICKET_FORM_THEMES.some((theme) => theme.value === value);
}

/** What is wrong with a new request before it is sent, or null. */
export function ticketDraftProblem(draft: {
  theme: string | null;
  subject: string;
  message: string;
}): string | null {
  if (draft.theme === null || !isTicketFormTheme(draft.theme)) return "Choisis un thème.";
  const subject = draft.subject.trim().length;
  if (subject < TICKET_SUBJECT_MIN) return "Un objet de 5 caractères au minimum.";
  if (subject > TICKET_SUBJECT_MAX) return "200 caractères au plus pour l'objet.";
  const message = draft.message.trim().length;
  if (message < TICKET_MESSAGE_MIN) return "Décris ta demande en 20 caractères au minimum.";
  if (message > TICKET_MESSAGE_MAX) return "5000 caractères au plus pour le message.";
  return null;
}

/** What is wrong with a reply before it is sent, or null. */
export function ticketReplyProblem(body: string): string | null {
  const length = body.trim().length;
  if (length < TICKET_REPLY_MIN) return "Écris un message avant d'envoyer.";
  if (length > TICKET_REPLY_MAX) return "5000 caractères au plus pour le message.";
  return null;
}
