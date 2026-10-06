import type { CSSProperties } from "react";

/**
 * The few colours and the font that hand-drawn pieces reach for by name: the
 * lesson labs, the MDX editor, the search, a certificate.
 *
 * Twenty-two files each declared their own copy of these, under the same
 * names, in four spellings of the accent, one of which was a fixed turquoise
 * that ignored the accent somebody had equipped. One module; the values are
 * the tokens stylesheet's.
 */
export const ACCENT = "var(--cosmetic-accent, #0AFFD4)";
export const MONO = "var(--font-mono, monospace)";
export const RED = "#FF4757";
export const DANGER = "#FF4D6D";
export const AMBER = "#FFB020";
export const BORDER = "#2A2560";
export const MUTED = "#7F7BA9";

/** The font as a style object, to spread into one. */
export const MONO_STYLE: CSSProperties = { fontFamily: MONO };
