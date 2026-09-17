/**
 * Folding text down to what a filter can actually match against.
 *
 * A word list applied to raw input catches nobody who is trying. The ways
 * round one are well known and cheap: accents, a zero-width space in the
 * middle, a zero for an o, letters spaced o u t, a letter repeated a dozen
 * times. Each of those is one line here, and skipping them would make the whole
 * feature theatre - it would stop the people who were not hiding anything and
 * nobody else.
 *
 * Normalisation is deliberately lossy and is never shown to anyone: what a
 * reviewer reads is the original text. This only decides what the rules see.
 */

/** Characters that carry no width and exist mostly to break up a word. */
const INVISIBLE = /[\u200B-\u200D\u2060\uFEFF\u00AD]/gu;

/** Digits and symbols standing in for letters. */
const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  $: "s",
  "!": "i",
  "|": "i",
  "+": "t",
};

/**
 * Lower-cases, strips accents and invisibles, maps look-alike characters back
 * to letters, and collapses a letter repeated three or more times down to two.
 *
 * Repetition is capped at two rather than one because doubles are ordinary in
 * both languages - "bonne", "sell" - and collapsing them would turn unrelated
 * words into each other.
 */
export function normalise(text: string): string {
  const mapped = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "")
    .replace(INVISIBLE, "")
    .toLowerCase()
    .split("")
    .map((c) => LEET[c] ?? c)
    .join("");

  return mapped.replace(/(.)\1{2,}/gu, "$1$1");
}

/**
 * The same folding, with every run of a repeated letter squeezed to one.
 *
 * normalise() stops at two because doubles are ordinary - "bonne", "sell" - and
 * collapsing them turns unrelated words into each other. But stopping at two
 * also lets "neeegre" through, which becomes "neegre" and matches nothing. So
 * this is a second view, matched alongside the first rather than instead of it:
 * a rule fires if either sees the term, and the words this one mangles are
 * words the other still reads correctly.
 */
export function squeezeRepeats(normalised: string): string {
  return normalised.replace(/(.)\1+/gu, "$1");
}

/**
 * The same text with separators between single letters removed, so "c o n" and
 * "c-o-n" read as one word.
 *
 * Kept apart from normalise() because the join is destructive in a way the rest
 * is not: it turns "a b c" into "abc", which is right when someone is spacing
 * out a slur and wrong for ordinary prose. Rules that want it ask for it, and
 * the two views are matched independently.
 */
export function joinSpacedLetters(normalised: string): string {
  // Only collapses runs of at least three single letters, which is what an
  // evasion looks like and what an initialism does not.
  return normalised.replace(/\b(?:[a-z][\s._\-*]){2,}[a-z]\b/gu, (run) =>
    run.replace(/[\s._\-*]/gu, ""),
  );
}
