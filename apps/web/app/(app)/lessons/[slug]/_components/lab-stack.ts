import type { CSSProperties } from "react";

/** The one track of a lab's column: as wide as the lab, never wider. */
export const LAB_TRACK = "minmax(0, 1fr)";

/**
 * The column a lab stacks its parts in. `display: grid` alone makes an
 * implicit `auto` track, and an `auto` track grows to the widest line it
 * cannot break, however deep: one line of code inside a <details> widened the
 * whole JwtLab, and every sibling stuck out of the frame with it. A
 * `minmax(0, 1fr)` track keeps to the lab's width, so a long line scrolls
 * inside its own box (overflow-x: auto) instead. `minWidth: 0` lets a stack
 * that is itself a grid or flex item shrink the same way.
 */
export function labStack(gap: number): CSSProperties {
  return { display: "grid", gridTemplateColumns: LAB_TRACK, gap, minWidth: 0 };
}
