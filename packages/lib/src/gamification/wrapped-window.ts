import { dayKey } from "./day.js";
import { yearKey } from "./wrapped.js";

/**
 * When Wrapped is open, and which year it recaps.
 *
 * It used to be open every day of the year, which is what made it furniture
 * rather than an event: a recap you can read any time is a page, and a recap
 * that arrives once is something people wait for and send to each other. So it
 * opens on 1 December and closes after 7 January.
 *
 * The seven days into January are not decoration. A year's recap published on
 * 1 December and withdrawn at midnight on the 31st would be unreadable for
 * anyone who spent the holidays away from a screen, and the year it recaps is
 * finished by then anyway - those seven days show the completed year, not the
 * new one.
 *
 * A pure function over an instant, so the rule can be tested at every boundary
 * rather than waited for. Dates are anchored to Europe/Paris through dayKey,
 * like every other calendar decision the platform makes.
 */

export const WRAPPED_OPENS_MONTH = 12;
export const WRAPPED_CLOSES_DAY_IN_JANUARY = 7;

export interface WrappedWindow {
  open: boolean;
  /** The year being recapped: the current one in December, the previous in January. */
  periodKey: string;
  /** "YYYY-MM-DD" in Europe/Paris when it next opens. Null while it is open. */
  opensOn: string | null;
}

export function wrappedWindow(now: Date): WrappedWindow {
  const today = dayKey(now); // "YYYY-MM-DD", Europe/Paris
  const year = Number(yearKey(now));
  const month = Number(today.slice(5, 7));
  const day = Number(today.slice(8, 10));

  if (month === WRAPPED_OPENS_MONTH) {
    return { open: true, periodKey: String(year), opensOn: null };
  }
  if (month === 1 && day <= WRAPPED_CLOSES_DAY_IN_JANUARY) {
    // January's grace period shows the year that just ended.
    return { open: true, periodKey: String(year - 1), opensOn: null };
  }

  // Closed. Every closed day falls between January and November, so the next
  // opening is always 1 December of the current year - including late January,
  // where the December just gone is eleven months behind rather than ahead.
  return {
    open: false,
    periodKey: String(month === 1 ? year - 1 : year),
    opensOn: `${String(year)}-12-01`,
  };
}
