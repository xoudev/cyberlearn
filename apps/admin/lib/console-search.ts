import { z } from "zod";
import type { ConsoleLessonHit, ConsoleTicketHit, ConsoleUserHit } from "@cyberlearn/db";
import { CONTENT_STATUS } from "../app/(admin)/_components/content-status";
import { STATUS_META } from "../app/(admin)/tickets/ticket-meta";
import {
  CONSOLE_SEARCH_MAX,
  CONSOLE_SEARCH_MIN,
  stripHandle,
  type SearchHit,
} from "./command-palette";
import { ROLE_LABEL } from "./roles";

/**
 * The server side of the top bar's quick search (POST /search): what it
 * accepts, and how each row it finds is shown. The route reads through the
 * repositories, at most CONSOLE_SEARCH_TAKE rows of each kind.
 */

/** How many accounts, lessons and tickets the search answers at most, each. */
export const CONSOLE_SEARCH_TAKE = 5;

/**
 * The query: trimmed, a leading @ dropped ("@amelie" is a handle as the
 * console prints it), then two to a hundred characters.
 */
export const consoleSearchSchema = z.object({
  q: z
    .string()
    .transform(stripHandle)
    .pipe(z.string().min(CONSOLE_SEARCH_MIN).max(CONSOLE_SEARCH_MAX)),
});

/** An account: its handle, or its name until onboarding gives it one. */
export function userHit(user: ConsoleUserHit): SearchHit {
  return {
    id: user.id,
    label: user.username !== null ? `@${user.username}` : user.displayName,
    sublabel: `${user.email} · ${ROLE_LABEL[user.role]}`,
    href: `/users/${user.id}`,
  };
}

/** A lesson, with its status: a draft or an archived one is found as well. */
export function lessonHit(lesson: ConsoleLessonHit): SearchHit {
  const audience = lesson.audience === "CLASS" ? " · leçon de classe" : "";
  return {
    id: lesson.id,
    label: lesson.title,
    sublabel: `${lesson.refCode} · ${CONTENT_STATUS[lesson.status].label}${audience}`,
    href: `/lessons/${lesson.id}/edit`,
  };
}

/** A ticket, with its status and who opened it, as the tickets list names them. */
export function ticketHit(ticket: ConsoleTicketHit): SearchHit {
  const username = ticket.user?.username ?? null;
  const requester =
    username !== null ? `@${username}` : (ticket.user?.displayName ?? ticket.email ?? "anonyme");
  const status = STATUS_META[ticket.status]?.label ?? ticket.status;
  return {
    id: ticket.id,
    label: ticket.subject,
    sublabel: `${status} · ${requester}`,
    href: `/tickets/${ticket.id}`,
  };
}
