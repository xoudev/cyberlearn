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
