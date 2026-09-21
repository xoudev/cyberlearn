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

export type ModerationRule = "slur" | "insult" | "threat" | "sexual" | "self-harm" | "vulgarity";

export interface LexiconEntry {
  /** Matched whole, against normalised text. */
  term: string;
  rule: ModerationRule;
  severity: number;
  /**
   * Allow a French inflection on the end: enculer, enculée, abrutis.
   *
   * Opt-in per entry rather than applied to the list, because the tail that
   * rescues "enculer" from "encule" is the same tail that turns "con" into
   * "cone". Set it on verbs and adjectives, never on a word that is a prefix
   * of an ordinary one.
   */
  inflect?: boolean;
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

/**
 * Aimed at somebody, in the words people actually use.
 *
 * The list above was written in single words, which is most of the way to
 * useless in French: the register is phrasal. "Tu est nul vas te faire foutre"
 * scored zero - reported from the forum, and reproduced - because not one of
 * its words is a word on its own list, and because "encule" does not match
 * "enculer".
 *
 * The phrases are stored in the middle - "te faire foutre" rather than "va te
 * faire foutre" - so that va/vas/allez and the rest cost nothing.
 */
const INSULT_PHRASES: string[] = [
  "te faire foutre",
  "te faire enculer",
  "te faire mettre",
  "te faire voir",
  "fils de pute",
  "fils de chien",
  "nique ta mere",
  "nique ta race",
  "ta mere la pute",
  "trou du cul",
  "tete de noeud",
  "sac a merde",
  "gros porc",
  "fuck you",
  "fuck off",
  "go to hell",
];

/** Same weight, and inflected: enculer, abrutie, débiles. */
const INFLECTED_INSULTS: string[] = [
  "encule",
  "abruti",
  "cretin",
  "debile",
  "attarde",
  "enfoire",
  "pouffiasse",
];

/**
 * Coarse, not aimed. Worth something and not worth a queue row on its own.
 *
 * Twenty rather than fifty on purpose: a teenager typing "merde" at a failing
 * exercise is not the case any of this exists for, and a filter that stops them
 * is a filter people learn to write around. Two of these together is 40, which
 * is a look; one is nothing.
 */
const VULGARITY: string[] = [
  "merde",
  "merdique",
  "chiant",
  "chiante",
  "bordel",
  "nul a chier",
  "casse toi",
  "ferme la",
  "shit",
  "damn",
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

function entries(
  terms: string[],
  rule: ModerationRule,
  severity: number,
  inflect = false,
): LexiconEntry[] {
  return terms.map((term) =>
    inflect ? { term, rule, severity, inflect } : { term, rule, severity },
  );
}

export const LEXICON: LexiconEntry[] = [
  ...entries(SLURS, "slur", 100),
  // 50, so that one is a look and two is a refusal. At 40 a pair came to 80 and
  // fell through the block threshold, which made "two insults is a pattern"
  // something the comments claimed and the code did not do.
  ...entries(INSULTS, "insult", 50),
  ...entries(INSULT_PHRASES, "insult", 50),
  ...entries(INFLECTED_INSULTS, "insult", 50, true),
  ...entries(THREATS, "threat", 100),
  ...entries(SEXUAL, "sexual", 35),
  ...entries(SELF_HARM, "self-harm", 60),
  ...entries(VULGARITY, "vulgarity", 20),
];

/** At or above this, the content is refused outright. */
export const BLOCK_AT = 100;
/** At or above this, it goes to a human. */
export const REVIEW_AT = 35;
