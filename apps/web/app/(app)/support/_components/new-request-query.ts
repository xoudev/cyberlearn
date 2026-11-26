import { TICKET_SUBJECT_MAX, type TicketFormTheme } from "@cyberlearn/lib/tickets/tickets";

/**
 * The parameter that opens the "Nouvelle demande" window over the page:
 * `?request=1` (registered in components/query-dialogs.ts). English, as the
 * site's addresses are (docs/dev/dialogs.md).
 */
export const NEW_REQUEST_QUERY = "request";

/** What a link can ask the window to open with already written. */
export interface RequestPrefill {
  theme: TicketFormTheme;
  subject: string;
}

/**
 * What a link to the window can be about, beyond opening it empty. The public
 * contact page takes the same two as `?ref=` and `?theme=&subject=`: a signed-in
 * reader is sent here instead, to write the request in the site and have the
 * answer sent to the account's address rather than to one typed by hand.
 */
export type RequestAbout =
  /** An error screen's incident reference (its digest). */
  | { incident: string }
  /** "Être prévenu" of the Android app, on /download. */
  | "android";

/**
 * « Signaler un souci »: the window over the page the reader is on, which it
 * names in the subject and sends with the request (lib/tickets/page-report.ts).
 * Opened in place, `?request=page`, never through /support.
 */
export const PAGE_REPORT_VALUE = "page";

/** The suffix every page's title carries (app/layout.tsx's template). */
const SITE_SUFFIX = /\s*·\s*CyberLearn\s*$/u;

/**
 * The subject of a report, from the title of the page it was opened over:
 * « Souci sur « Introduction aux injections SQL » ». The site's name is left
 * out, a title too long is cut to fit, and a page without one is "une page".
 */
export function pageReportSubject(documentTitle: string): string {
  const title = documentTitle.replace(SITE_SUFFIX, "").trim();
  if (title === "" || title === "CyberLearn") return "Souci sur une page du site";
  const frame = (inner: string): string => `Souci sur « ${inner} »`;
  const room = TICKET_SUBJECT_MAX - frame("").length;
  return frame(title.length > room ? `${title.slice(0, room - 1).trimEnd()}…` : title);
}

const INCIDENT_PREFIX = "incident-";
const ANDROID_VALUE = "android";
/** What an incident reference may be made of: a digest, never free text. */
const INCIDENT_REFERENCE = /^[A-Za-z0-9_-]{1,64}$/u;

const ANDROID_PREFILL: RequestPrefill = {
  theme: "FEATURE_REQUEST",
  subject: "Disponibilité de l'application Android",
};

/**
 * The address that opens the window over /support, written when it is
 * opened. An incident reference that is not a plain token is left out rather
 * than carried into the address.
 */
export function newRequestHref(about?: RequestAbout): string {
  let value = "1";
  if (about === "android") value = ANDROID_VALUE;
  else if (about !== undefined && INCIDENT_REFERENCE.test(about.incident)) {
    value = `${INCIDENT_PREFIX}${about.incident}`;
  }
  return `/support?${NEW_REQUEST_QUERY}=${encodeURIComponent(value)}`;
}

/**
 * What the parameter's value says to write in advance: null for `1` and for
 * anything this does not know, since an address is something anybody can write.
 */
export function newRequestPrefill(value: string, documentTitle = ""): RequestPrefill | null {
  if (value === ANDROID_VALUE) return ANDROID_PREFILL;
  if (value === PAGE_REPORT_VALUE) {
    return { theme: "BUG", subject: pageReportSubject(documentTitle) };
  }
  if (value.startsWith(INCIDENT_PREFIX)) {
    const reference = value.slice(INCIDENT_PREFIX.length);
    if (INCIDENT_REFERENCE.test(reference)) {
      // The subject the public form gives an incident, so the team finds both alike.
      return { theme: "BUG", subject: `Incident ${reference}` };
    }
  }
  return null;
}
