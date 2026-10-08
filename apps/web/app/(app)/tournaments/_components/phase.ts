import { TOURNAMENT_TIMEZONE } from "@cyberlearn/lib/challenges/tournament";

/**
 * The date plate of the tournament list, which only the site draws. What the
 * site and the app both work out from a tournament's window and counts (the
 * share gone by, a length, a count and its noun) is
 * @cyberlearn/lib/challenges/tournament. The colour of a phase is the
 * stylesheet's (tournaments.css, data-phase).
 */

const PLATE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TOURNAMENT_TIMEZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** A date cut for a calendar plate, in Paris time: "16", "oct.", "ven.", "14:00". */
export function datePlate(iso: string): {
  day: string;
  month: string;
  weekday: string;
  time: string;
} {
  const parts = PLATE.formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? "";
  return {
    day: part("day"),
    month: part("month"),
    weekday: part("weekday"),
    time: `${part("hour")}:${part("minute")}`,
  };
}
