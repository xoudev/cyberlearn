import type { FindingRule } from "./moderate.js";

/**
 * What a rule is called to somebody who is not a moderator.
 *
 * One vocabulary, in one place, because two readers need it and they were
 * getting different words: the teacher's notification is written in the
 * repository and the author's refusal in the server action, and "insultes"
 * in one next to "contenu inapproprié" in the other reads as two different
 * events to the two people discussing the same note.
 *
 * The admin console keeps its own, capitalised labels. Its reader is a
 * moderator working a queue, and a chip is not a sentence.
 */
export const RULE_LABEL: Record<FindingRule, string> = {
  slur: "propos haineux",
  insult: "insultes",
  vulgarity: "grossièretés",
  threat: "menaces",
  sexual: "contenu sexuel",
  "self-harm": "allusions au mal-être",
  "contact-details": "coordonnées personnelles",
  "link-spam": "liens suspects",
  shouting: "écriture en majuscules",
};

/**
 * The rules that are about a person, and so are a teacher's business.
 *
 * The screen refuses a share on any flag at all, which is the point - the note
 * is the author's either way and a retry costs nothing. Telling a teacher is
 * not free in the same way: it is an accusation with a name attached, and a
 * student who pasted two source links has not done anything a teacher needs to
 * hear about. Send those and the alerts become noise, which is the failure
 * mode that ends with nobody reading them.
 *
 * Contact details are on the list deliberately. A fifteen-year-old handing out
 * their phone number is not an offence and is exactly what an adult should see.
 */
const PERSONAL_RULES: ReadonlySet<FindingRule> = new Set<FindingRule>([
  "slur",
  "insult",
  "threat",
  "sexual",
  "self-harm",
  "contact-details",
]);

/** Whether a refusal over these rules is worth an adult's attention. */
export function concernsAPerson(rules: readonly FindingRule[]): boolean {
  return rules.some((rule) => PERSONAL_RULES.has(rule));
}

/** The rules named in French, each once, in the order they were found. */
export function labelRules(rules: readonly FindingRule[]): string[] {
  return [...new Set(rules)].map((rule) => RULE_LABEL[rule]);
}
