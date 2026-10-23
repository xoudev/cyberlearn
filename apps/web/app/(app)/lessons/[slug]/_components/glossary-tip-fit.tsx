"use client";

// "use client" justification: keeping a definition on screen means measuring it
// where the browser draws it, and moving it when it would be cut. Showing and
// hiding it stays the stylesheet's (`.glossary-term`, `.glossary-tip`).

import { useEffect } from "react";

/**
 * The custom property a glossary word carries when its definition has to move
 * sideways to stay on screen. `.glossary-tip` reads it for its `left`
 * (globals.css).
 */
export const GLOSSARY_SHIFT_PROPERTY = "--glossary-shift";

/** What a definition keeps clear of the edge of the page's column, in px. */
export const GLOSSARY_TIP_MARGIN = 12;

/** A horizontal extent, in the viewport's coordinates. */
export interface Span {
  left: number;
  right: number;
}

/**
 * How far a definition has to move sideways (negative: to the left) to lie
 * inside `bounds`, `margin` clear of both edges; zero when it fits already.
 * One wider than the room it has keeps its start in view, the part read first.
 *
 * A definition starts at its word's left edge and spreads to the right, so a
 * word near the right edge of a phone, or of the column beside the docked
 * notes, had its definition cut short by the page's `overflow-x: clip`.
 */
export function tipShift(tip: Span, bounds: Span, margin: number = GLOSSARY_TIP_MARGIN): number {
  const min = bounds.left + margin;
  const max = bounds.right - margin;
  if (tip.right - tip.left >= max - min) return min - tip.left;
  if (tip.right > max) return max - tip.right;
  if (tip.left < min) return min - tip.left;
  return 0;
}

/**
 * The room a definition may take: the page's content area, which is where the
 * window clips it. The docked notes sit in the padding of `<main>` (globals.css),
 * so that padding is left out.
 */
function roomOf(word: HTMLElement): Span {
  const viewport = document.documentElement.clientWidth;
  const main = word.closest("main");
  if (main === null) return { left: 0, right: viewport };
  const box = main.getBoundingClientRect();
  const style = getComputedStyle(main);
  return {
    left: Math.max(0, box.left) + (Number.parseFloat(style.paddingLeft) || 0),
    right: Math.min(viewport, box.right) - (Number.parseFloat(style.paddingRight) || 0),
  };
}

/**
 * Moves a glossary word's definition inside the page if it would be cut at an
 * edge. The definition is drawn only while the word is hovered or focused, so
 * it is measured as it will be drawn: shown, without being seen.
 */
export function fitGlossaryTip(word: HTMLElement): void {
  const tip = word.querySelector<HTMLElement>(".glossary-tip");
  if (tip === null) return;
  word.style.removeProperty(GLOSSARY_SHIFT_PROPERTY);
  const { display, visibility } = tip.style;
  tip.style.display = "block";
  tip.style.visibility = "hidden";
  const box = tip.getBoundingClientRect();
  tip.style.display = display;
  tip.style.visibility = visibility;
  const shift = tipShift({ left: box.left, right: box.right }, roomOf(word));
  if (shift !== 0) word.style.setProperty(GLOSSARY_SHIFT_PROPERTY, `${String(shift)}px`);
}

function fitFromEvent(event: Event): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const word = target.closest<HTMLElement>(".glossary-term");
  if (word === null) return;
  // Moving from the word to its own definition is not a new hover.
  if (event instanceof MouseEvent && event.relatedTarget instanceof Node) {
    if (word.contains(event.relatedTarget)) return;
  }
  fitGlossaryTip(word);
}

/** How many mounted components want the listeners: they are put up once, for all. */
let users = 0;

/**
 * Keeps the glossary's definitions on screen, for every word of the page. It
 * listens once on the document (a lesson has hundreds of words, none of them
 * hydrated) and draws nothing. A word tapped or hovered is measured then; one
 * the sheet would show cut at an edge gets `--glossary-shift`.
 */
export function GlossaryTipFit(): null {
  useEffect(() => {
    if (users++ === 0) {
      document.addEventListener("pointerover", fitFromEvent);
      document.addEventListener("focusin", fitFromEvent);
    }
    return () => {
      if (--users === 0) {
        document.removeEventListener("pointerover", fitFromEvent);
        document.removeEventListener("focusin", fitFromEvent);
      }
    };
  }, []);
  return null;
}
