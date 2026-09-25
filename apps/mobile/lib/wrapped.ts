import type { AccentName } from "@cyberlearn/lib/gamification/wrapped-story";
import type { WrappedPayload } from "@cyberlearn/lib/gamification/wrapped";

/**
 * Wrapped in the app: the site's story (same slides, same words, same
 * window), played on a phone. What a slide says is decided by
 * @cyberlearn/lib/gamification/wrapped-story; when Wrapped is open, by the
 * server's clock (/api/mobile/wrapped) and, for showing the entry at all, by
 * the same wrappedWindow the site's navbar reads.
 */

export {
  SLIDE_MS,
  buildStorySlides,
  fmtNumber,
  type AccentName,
  type Slide,
} from "@cyberlearn/lib/gamification/wrapped-story";
export { wrappedWindow } from "@cyberlearn/lib/gamification/wrapped-window";
export type { WrappedPayload } from "@cyberlearn/lib/gamification/wrapped";

/** Below this, a press was a tap; above it, somebody was holding to read. */
export const HOLD_MS = 220;

/** The site's slide colours; turquoise is the reader's own accent, as on the site. */
export function accentColor(name: AccentName, themeAccent: string): string {
  switch (name) {
    case "blue":
      return "#4d8bff";
    case "amber":
      return "#ffb547";
    case "rose":
      return "#ff5b6e";
    case "violet":
      return "#b14dff";
    case "turquoise":
      return themeAccent;
  }
}

/** Where a tap on the story goes: the left half back, the right half on, as on the site. */
export function tapDirection(x: number, width: number): "previous" | "next" {
  return x < width / 2 ? "previous" : "next";
}

/** The slide a step lands on; the story stops at both ends rather than wrapping. */
export function stepIndex(index: number, count: number, direction: "previous" | "next"): number {
  const last = Math.max(0, count - 1);
  return direction === "next" ? Math.min(index + 1, last) : Math.max(index - 1, 0);
}

/**
 * What the share sheet sends. The site hands over a drawn image; the app sends
 * the year in words, which every share target takes.
 */
export function wrappedShareText(payload: WrappedPayload, handle: string): string {
  const n = (value: number): string => value.toLocaleString("fr-FR");
  const plural = (count: number, one: string, many: string): string =>
    `${n(count)} ${count > 1 ? many : one}`;
  const parts = [
    `${n(payload.xp.thisYear)} XP`,
    plural(payload.lessons.total, "leçon", "leçons"),
    `${plural(payload.streak.longest, "jour", "jours")} de série`,
    plural(payload.badges.thisYear, "badge", "badges"),
  ];
  return `Mon année ${payload.periodKey} sur CyberLearn (@${handle}) : ${parts.join(", ")}. cyberlearn.fr`;
}

/** "Ouverture le 1 décembre · 67 jours", from the server's "YYYY-MM-DD". */
export function opensLabel(opensOn: string, now: number): string {
  const MONTHS = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ];
  const [, month, day] = opensOn.split("-").map(Number);
  const date = `${String(day ?? 1)} ${MONTHS[(month ?? 1) - 1] ?? ""}`;
  const days = Math.max(
    0,
    Math.ceil((new Date(`${opensOn}T00:00:00Z`).getTime() - now) / (24 * 60 * 60 * 1000)),
  );
  return days > 0
    ? `Ouverture le ${date} · ${String(days)} jour${days > 1 ? "s" : ""}`
    : `Ouverture le ${date}`;
}
