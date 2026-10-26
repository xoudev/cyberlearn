import type { TicketStatusKey, TicketThemeKey } from "./tickets";

/**
 * A ban appeal as the banned account sees it, on /banned and in the app.
 *
 * An appeal is a ticket, but its author is shut out of every page that shows a
 * ticket: the ban gate sends /support/<id> back to /banned. So /banned is the
 * only place the team's answer can be read, and it used to say "transmis, la
 * réponse arrivera par e-mail" whatever became of the ticket - forever, for an
 * appeal that was answered and refused. These are the words for each stage,
 * written once for both apps.
 *
 * The page is shown while a ban is in force, so a finished appeal here is by
 * definition one that did not lift it: accepting an appeal lifts the ban and
 * sends the account back to its dashboard.
 */

/** Where the appeal stands. */
export type AppealStage = "RECEIVED" | "IN_REVIEW" | "DECIDED";

/** The team's last written answer on the appeal. */
export interface AppealReply {
  body: string;
  /** ISO 8601, so the view crosses the wire to the app unchanged. */
  createdAt: string;
}

/** What /banned and the app's banned screen say about the appeal. */
export interface AppealView {
  stage: AppealStage;
  title: string;
  text: string;
  /** Null until the team has written something. */
  reply: AppealReply | null;
}

/** Whether a ticket is somebody contesting a ban. */
export function isBanAppeal(theme: TicketThemeKey): boolean {
  return theme === "BAN_APPEAL";
}

/**
 * Whether the e-mail of a team reply goes out, given what the account chose.
 *
 * "Avis par email" is about notices - a moderation decision, work from a
 * class - that are also in the bell, so cutting the e-mail loses nothing. A
 * reply to a ban appeal is not one of them: its author cannot open the bell,
 * nor the ticket's page, until the ban is over, so the e-mail is the one way
 * the decision reaches them and it is sent whatever they chose. Every other
 * ticket keeps the choice, because its reply is also on the requester's page.
 */
export function ticketReplyEmailWanted(input: {
  theme: TicketThemeKey;
  /** Null when the requester has no preferences row, or no account. */
  emailNotifications: boolean | null;
}): boolean {
  if (isBanAppeal(input.theme)) return true;
  return input.emailNotifications !== false;
}

/** The stage a status puts an appeal at. */
export function appealStageOf(status: TicketStatusKey): AppealStage {
  switch (status) {
    case "OPEN":
      return "RECEIVED";
    case "IN_PROGRESS":
      return "IN_REVIEW";
    case "RESOLVED":
    case "CLOSED":
      return "DECIDED";
  }
}

const TITLE: Record<AppealStage, string> = {
  RECEIVED: "Appel transmis",
  IN_REVIEW: "Appel en cours d'examen",
  DECIDED: "Appel examiné",
};

/**
 * The appeal for the screen: its stage, the sentence that goes with it, and
 * the team's last answer when there is one.
 *
 * The last staff message is the answer. An appeal accepted from the console
 * lifts the ban and never reaches this view, so the answer read here is the
 * explanation of a decision that stands.
 */
export function appealView(input: {
  status: TicketStatusKey;
  reply: AppealReply | null;
}): AppealView {
  const stage = appealStageOf(input.status);
  const answered = input.reply !== null;

  let text: string;
  switch (stage) {
    case "RECEIVED":
      text =
        "Ton appel a été transmis à l'équipe de modération. Sa réponse arrivera par e-mail et s'affichera ici : elle contient la décision, pas seulement un avis de passage.";
      break;
    case "IN_REVIEW":
      text = answered
        ? "L'équipe de modération t'a répondu ci-dessous. Ton appel reste en cours d'examen : la décision arrivera par e-mail et s'affichera ici."
        : "L'équipe de modération a pris ton appel en charge. Sa décision arrivera par e-mail et s'affichera ici.";
      break;
    case "DECIDED":
      text = answered
        ? "L'équipe de modération a examiné ton appel : le bannissement est maintenu. Sa dernière réponse est ci-dessous. Un seul appel est possible par décision."
        : "L'équipe de modération a examiné ton appel : le bannissement est maintenu. Elle n'a pas laissé de réponse écrite. Un seul appel est possible par décision.";
      break;
  }

  return { stage, title: TITLE[stage], text, reply: input.reply };
}
