import { z } from "zod";

/**
 * What « Signaler un souci » sends with the request, besides what the reader
 * wrote: the page it was opened over, the size of the screen, and the browser
 * (read from the request's headers on the server, never from the form).
 *
 * The beta's first question on every report used to be "where, on what?":
 * here it is answered before it is asked. The path alone, never the query
 * string or the fragment, which can carry a token or another window's state.
 */

/** The page, its screen: what the window measures in the browser. */
export const pageReportSchema = z.object({
  // A path of the site: starts with "/", no space, no query, no fragment.
  page: z
    .string()
    .max(300)
    .regex(/^\/[^\s?#]*$/u),
  width: z.number().int().min(1).max(20000),
  height: z.number().int().min(1).max(20000),
});

export type PageReport = z.infer<typeof pageReportSchema>;

/** The user agent as the console stores it (contact_tickets.userAgent, 500 characters). */
export const USER_AGENT_MAX = 500;

/**
 * What a user agent says, and the name it means, in the order to ask: Edge and
 * Opera say "Chrome", Chrome says "Safari", an iPhone says "Mac OS X" and
 * Android says "Linux". The first that is there wins.
 */
const BROWSERS: readonly (readonly [string, string])[] = [
  ["Edg/", "Edge"],
  ["OPR/", "Opera"],
  ["Firefox/", "Firefox"],
  ["Chrome/", "Chrome"],
  ["Safari/", "Safari"],
];
const SYSTEMS: readonly (readonly [string, string])[] = [
  ["Android", "Android"],
  ["iPhone", "iOS"],
  ["iPad", "iOS"],
  ["Windows", "Windows"],
  ["Mac OS X", "macOS"],
  ["Linux", "Linux"],
];

function firstIn(userAgent: string, table: readonly (readonly [string, string])[]): string | null {
  return table.find(([needle]) => userAgent.includes(needle))?.[1] ?? null;
}

/**
 * A browser and its system, in words, from a user agent: "Firefox sur Linux".
 * Null when neither is recognised; the console keeps the full string anyway.
 */
export function browserLabel(userAgent: string): string | null {
  const browser = firstIn(userAgent, BROWSERS);
  const system = firstIn(userAgent, SYSTEMS);
  if (browser === null) return system;
  return system === null ? browser : `${browser} sur ${system}`;
}

/**
 * The lines added under the reader's message, in the thread both sides read:
 * the requester sees what was sent with it, the team where to look.
 */
export function pageReportBlock(report: PageReport, userAgent: string | null): string {
  const lines = [
    "Envoyé depuis le site :",
    `Page : ${report.page}`,
    `Écran : ${String(report.width)} × ${String(report.height)}`,
  ];
  const browser = userAgent === null ? null : browserLabel(userAgent);
  if (browser !== null) lines.push(`Navigateur : ${browser}`);
  return `\n\n${lines.join("\n")}`;
}
