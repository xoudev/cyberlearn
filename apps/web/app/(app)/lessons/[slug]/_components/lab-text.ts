import type { CSSProperties } from "react";
import { MONO } from "@cyberlearn/ui";

/**
 * The text sizes of a lab, in one place. Each lab spelled its own: the kicker
 * of its head at 10px, a field's name at 11px, which at a lab's reading
 * distance is the size of a footnote. A label is now 12px and the monospace a
 * lab writes its content in (code, bytes, commands, results) 13px, the floor
 * of what reads without leaning in.
 */

/** A lab's labels: the kicker of its head, a field's name, a column's title. */
export const LAB_LABEL_SIZE = 12;

/** What a lab writes in the monospace: code, bytes, commands, results. */
export const LAB_MONO_SIZE = 13;

/** The kicker in a lab's head ("RÉSEAU · ATELIER"), in its colour. */
export function labKicker(color: string): CSSProperties {
  return { fontFamily: MONO, fontSize: LAB_LABEL_SIZE, letterSpacing: "0.16em", color };
}
