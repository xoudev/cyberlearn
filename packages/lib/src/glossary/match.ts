import { GLOSSARY, type GlossaryTerm } from "./terms";

/** One glossary word found in a piece of text. */
export interface GlossaryHit {
  /** Where it starts and ends in the text, end excluded. */
  start: number;
  end: number;
  /** The word as written there. */
  text: string;
  term: GlossaryTerm;
}

/** A lowercase form also reads as the first word of a sentence. */
function forms(term: GlossaryTerm): string[] {
  const out = new Set<string>();
  for (const form of term.match) {
    out.add(form);
    const first = form.charAt(0);
    if (first !== first.toUpperCase()) out.add(first.toUpperCase() + form.slice(1));
  }
  return [...out];
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/gu, "\\$&");
}

const BY_FORM = new Map<string, GlossaryTerm>();
for (const term of GLOSSARY) {
  for (const form of forms(term)) BY_FORM.set(form, term);
}

// Built once, from the list above. The longest form comes first, so that
// "injection SQL" wins over "SQL". A letter, a digit, an underscore or a hyphen
// on either side means the form is part of a longer word: "IP" in "IPv4",
// "port" in "transport". Written without lookbehind or \p{L}, which the app's
// JavaScript engine (Hermes) is not guaranteed to have: the character before
// the word is captured instead, and Latin letters are listed by range.
// The hyphen goes last, where a character class reads it as itself.
const WORD_CHAR = "0-9A-Za-z\u00C0-\u024F_-";
const PATTERN = new RegExp(
  `(^|[^${WORD_CHAR}])(${[...BY_FORM.keys()]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|")})(?![${WORD_CHAR}])`,
  "g",
);

/**
 * The glossary words in `text`, in order: whole words only, and each term at
 * most once across the calls that share `seen` (which this adds to), so that a
 * lesson section underlines a word the first time and leaves the rest alone.
 */
export function findGlossaryTerms(text: string, seen: Set<string>): GlossaryHit[] {
  const hits: GlossaryHit[] = [];
  for (const m of text.matchAll(PATTERN)) {
    const before = m[1] ?? "";
    const word = m[2] ?? "";
    const term = BY_FORM.get(word);
    if (term === undefined || seen.has(term.slug)) continue;
    seen.add(term.slug);
    const start = m.index + before.length;
    hits.push({ start, end: start + word.length, text: word, term });
  }
  return hits;
}
