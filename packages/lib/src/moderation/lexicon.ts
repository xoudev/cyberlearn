/**
 * The terms the filter reacts to, with what each one is worth.
 *
 * Two languages because the platform is French and the field is English: a
 * filter that only knows one of them is open on the other side.
 *
 * Severity rather than a flat list. A single unambiguous slur is enough on its
 * own; an insult is not the same thing as a threat, and treating them alike
 * either lets the serious case through or blocks a classroom argument. The
 * numbers are the whole policy and they are in one place, so tuning it is
 * editing this file rather than hunting through the analyser.
 *
 * Matched on word boundaries against normalised text, which is what keeps
 * "réputé" from tripping on "pute" and "Scunthorpe" from tripping at all - the
 * classic way these lists become unusable. The suite has a case for each.
 */

export type ModerationRule = "slur" | "insult" | "threat" | "sexual" | "self-harm";

export interface LexiconEntry {
  /** Matched whole, against normalised text. */
  term: string;
  rule: ModerationRule;
  severity: number;
}

/**
 * BLOCK on its own. Terms whose only use is to attack someone for what they
 * are - there is no classroom context that needs them.
 */
const SLURS: string[] = [
  "negre",
  "negro",
  "nigger",
  "bougnoule",
  "youpin",
  "pede",
  "pedale",
  "tapette",
  "faggot",
  "tranny",
  "chink",
  "sale arabe",
  "sale juif",
  "sale noir",
  "mongol",
  "retarded",
];

/** Rude, and on its own only worth a look. Two of them is a pattern. */
const INSULTS: string[] = [
  "connard",
  "connasse",
  "salope",
  "pute",
  "putain",
  "enculé",
  "encule",
  "batard",
  "ferme ta gueule",
  "ta gueule",
  "fdp",
  "ntm",
  "asshole",
  "bitch",
  "bastard",
  "cunt",
  "motherfucker",
];

/** Aimed at a person, which is what separates these from swearing. */
const THREATS: string[] = [
  "je vais te tuer",
  "je vais te frapper",
  "je te bute",
  "on va te retrouver",
  "je sais ou tu habites",
  "i will kill you",
  "i know where you live",
  "watch your back",
];

const SEXUAL: string[] = ["porn", "porno", "xxx", "nudes", "bite", "chatte", "salopard"];

/**
 * Not moderation in the same sense - nothing here is an offence. It is flagged
 * so a person sees it quickly, which for a platform full of teenagers is the
 * one category where being slow is the real failure.
 */
const SELF_HARM: string[] = [
  "je veux mourir",
  "je vais me suicider",
  "me suicider",
  "envie de mourir",
  "kill myself",
  "end my life",
];

function entries(terms: string[], rule: ModerationRule, severity: number): LexiconEntry[] {
  return terms.map((term) => ({ term, rule, severity }));
}

export const LEXICON: LexiconEntry[] = [
  ...entries(SLURS, "slur", 100),
  // 50, so that one is a look and two is a refusal. At 40 a pair came to 80 and
  // fell through the block threshold, which made "two insults is a pattern"
  // something the comments claimed and the code did not do.
  ...entries(INSULTS, "insult", 50),
  ...entries(THREATS, "threat", 100),
  ...entries(SEXUAL, "sexual", 35),
  ...entries(SELF_HARM, "self-harm", 60),
];

/** At or above this, the content is refused outright. */
export const BLOCK_AT = 100;
/** At or above this, it goes to a human. */
export const REVIEW_AT = 35;
