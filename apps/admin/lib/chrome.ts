/**
 * The fixed pieces of the console's shell, as numbers rather than as copies of
 * the same literal in several files.
 *
 * The top bar's height is written wherever something has to agree with it:
 * the bar itself (.a-topbar in admin-ui.css), the sidebar that starts under
 * it, and the offset that keeps a toast from landing on top of it. A toast
 * covering the quick search is the kind of bug nobody traces back to a number.
 */

/** The brand line across the top of every console page (body::before in globals.css). */
export const BRAND_STRIP_HEIGHT = 2;

/** The top bar sits under the brand line and is this tall at every width. */
export const TOPBAR_HEIGHT = 56;

/** Where the page under the fixed chrome starts: the sidebar's top. */
export const CHROME_BOTTOM = BRAND_STRIP_HEIGHT + TOPBAR_HEIGHT;

/** Air between the bar and whatever floats beneath it. */
const CHROME_GAP = 12;

/**
 * How far down a toast starts. Toasts sit at the top centre, where the eye
 * already is after a click, and start below the bar instead of across it.
 */
export const TOAST_TOP_OFFSET = CHROME_BOTTOM + CHROME_GAP;
