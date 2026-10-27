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
 * On a phone the navbar's panels (the friends, the notifications) span the
 * window instead of hanging from the button: this far from its left and right
 * edges, and this far below the bar.
 */
export const NAVBAR_PANEL_INSET = 8;

/**
 * Where a navbar panel starts on a phone, from the top of the window: below
 * the bar. globals.css (.fp-panel, .notif-panel) carries a copy of it.
 */
export const NAVBAR_PANEL_TOP = NAVBAR_HEIGHT + NAVBAR_PANEL_INSET;

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
 * The lesson toolbar (lessons/[slug]/_components/lesson-toolbar.tsx) is this
 * tall, and sticks flush under the navbar rather than at STICKY_TOP: it spans
 * the lesson's column, and the text scrolling through a gap above it would
 * show between the two bars. A lesson's anchors, and each new section, land
 * below both with the usual air: STICKY_TOP + LESSON_TOOLBAR_HEIGHT, which
 * globals.css carries a copy of.
 */
export const LESSON_TOOLBAR_HEIGHT = 56;

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
