/**
 * The fixed pieces of the authenticated shell, as numbers rather than as
 * copies of the same literal in three files.
 *
 * The navbar's height is written wherever something has to agree with it: the
 * bar itself, the placeholder standing in for it while it streams in, and the
 * offset that keeps a toast from landing on top of it. Two of the three would
 * go on looking right after somebody changed the fourth, and the result - a
 * message covering the search box, or the page jumping as the bar arrives - is
 * the kind of bug nobody traces back to a number.
 */

/** The navbar is sticky and this tall at every width. */
export const NAVBAR_HEIGHT = 56;

/** Air between the bar and whatever floats beneath it. */
const CHROME_GAP = 12;

/**
 * How far down a toast starts.
 *
 * Toasts sit at the top centre: a message about what just happened belongs
 * where the eye already is, not in a corner it has to be looked for in. Top
 * centre puts it over the navbar, though, so it starts below the bar instead
 * of across it - every toast in this app is raised from a page that has one.
 */
export const TOAST_TOP_OFFSET = NAVBAR_HEIGHT + CHROME_GAP;

/** Air above and below a sticky rail at rest. */
const STICKY_GAP = 24;

/**
 * Where a sticky element of a page comes to rest: below the navbar, which is
 * sticky too and would otherwise cover its first 56 pixels. It is also where
 * an anchor lands (`scroll-padding-top` in globals.css), for the same reason.
 */
export const STICKY_TOP = NAVBAR_HEIGHT + STICKY_GAP;

/**
 * The `top` a rail this tall sticks at. One that can be read whole below the
 * navbar rests there, at STICKY_TOP. A taller one rests by its bottom instead,
 * the same air above the bottom of the window: its `top` comes out under
 * STICKY_TOP, below zero for a rail about as tall as the window or taller, so
 * it scrolls with the page until its last line is in sight and stays there.
 * Left in the flow, it would scroll away as soon as it had been read, however
 * long the column beside it went on.
 */
export function railStickyTop(railHeight: number, viewportHeight: number): number {
  return Math.min(STICKY_TOP, viewportHeight - railHeight - STICKY_GAP);
}
