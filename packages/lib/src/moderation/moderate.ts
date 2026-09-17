import { BLOCK_AT, LEXICON, REVIEW_AT, type ModerationRule } from "./lexicon.js";
import { joinSpacedLetters, normalise, squeezeRepeats } from "./normalise.js";

/**
 * One screen, for every surface where a person publishes something to another
 * person: a shared note, a forum post, a question under a lesson.
 *
 * It exists once because the alternative is each surface growing its own, and
 * the second one is always weaker than the first - it is written in a hurry,
 * it forgets normalisation, and nobody notices until something gets through it
 * that the other would have caught.
 *
 * It is a first pass and is meant to read as one. It refuses what is
 * unambiguous, sends the rest to a person, and records why either way so the
 * person can disagree. Nothing here decides anything permanent about an
 * account.
 */

export type ModerationVerdict = "ALLOW" | "REVIEW" | "BLOCK";

export type FindingRule = ModerationRule | "contact-details" | "link-spam" | "shouting";

export interface ModerationFinding {
  rule: FindingRule;
  severity: number;
  /** What tripped it, for a reviewer. Never the whole text. */
  match: string;
}

export interface ModerationResult {
  verdict: ModerationVerdict;
  score: number;
  findings: ModerationFinding[];
}

export interface ModerateOptions {
  /**
   * Whether links are ordinary here. They are in a forum post about a tool and
   * they are not in a note shared with a classmate, so the surface decides.
   */
  allowLinks?: boolean;
}

// Deliberately loose: it is looking for someone handing out a way to be
// contacted off-platform, not validating an address.
const EMAIL = /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/giu;
// No leading \b: a "+" is not a word character, so there is no boundary before
// it and "+33 6 12 34 56 78" never matched. A lookbehind for a digit is what
// was actually meant - do not start in the middle of a longer number.
const PHONE_FR = /(?<!\d)(?:\+33|0)\s?[1-9](?:[\s.-]?\d{2}){4}(?!\d)/gu;
const URL = /\bhttps?:\/\/\S+|\bwww\.\S+/giu;

/** Repeated letters were already collapsed, so this is about capitals. */
function shoutingScore(text: string): number {
  const letters = text.replace(/[^a-zA-Z]/gu, "");
  if (letters.length < 25) return 0;
  const upper = letters.replace(/[^A-Z]/gu, "").length;
  return upper / letters.length > 0.7 ? 15 : 0;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export function moderate(text: string, options: ModerateOptions = {}): ModerationResult {
  const findings: ModerationFinding[] = [];

  // Three views of the same text, matched independently. Each catches an
  // evasion the others miss, and each mangles words the others read correctly -
  // which is why they are matched alongside one another rather than chained.
  const flat = normalise(text);
  const joined = joinSpacedLetters(flat); // "c o n n a r d"
  const squeezed = squeezeRepeats(flat); // "neeegre"
  const views = [flat, joined, squeezed];

  const seen = new Set<string>();
  for (const entry of LEXICON) {
    const needle = normalise(entry.term);
    // \b does not fire next to a space inside a multi-word term, so the pattern
    // is built around the whole phrase rather than per word.
    const pattern = new RegExp(`(?<![a-z0-9])${escapeRegExp(needle)}(?![a-z0-9])`, "u");
    // The needle is squeezed too when tested against the squeezed view, or
    // "connard" would never match a text folded to "conard".
    const squeezedNeedle = new RegExp(
      `(?<![a-z0-9])${escapeRegExp(squeezeRepeats(needle))}(?![a-z0-9])`,
      "u",
    );
    const hit = views.some((view, i) => (i === 2 ? squeezedNeedle : pattern).test(view));
    if (!hit) continue;
    if (seen.has(entry.term)) continue;
    seen.add(entry.term);
    findings.push({ rule: entry.rule, severity: entry.severity, match: entry.term });
  }

  const emails = text.match(EMAIL) ?? [];
  const phones = text.match(PHONE_FR) ?? [];
  if (emails.length + phones.length > 0) {
    // Not an offence, and not nothing: a fifteen-year-old handing out their
    // phone number under a lesson is the thing a teacher would want to see.
    findings.push({
      rule: "contact-details",
      severity: 40,
      match: [...emails, ...phones].slice(0, 3).join(", "),
    });
  }

  const links = text.match(URL) ?? [];
  if (options.allowLinks !== true && links.length > 0) {
    findings.push({
      rule: "link-spam",
      // One link where links are not expected contributes without tripping
      // anything on its own - people paste a source. Two is worth a look, and a
      // wall of them is what spam looks like.
      severity: links.length >= 3 ? 60 : links.length === 2 ? 40 : 20,
      match: links.slice(0, 3).join(", "),
    });
  }

  const shouting = shoutingScore(text);
  if (shouting > 0) {
    findings.push({ rule: "shouting", severity: shouting, match: "MAJUSCULES" });
  }

  const score = findings.reduce((sum, f) => sum + f.severity, 0);
  const verdict: ModerationVerdict =
    score >= BLOCK_AT ? "BLOCK" : score >= REVIEW_AT ? "REVIEW" : "ALLOW";

  return { verdict, score, findings };
}

/** A short, safe quotation for a moderation record. */
export function excerpt(text: string, max = 300): string {
  const flat = text.replace(/\s+/gu, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}
