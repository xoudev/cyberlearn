import { z } from "zod";

/**
 * Zod's own messages, in French, for the site, the mobile app and the console.
 *
 * A form error that a schema does not word itself is shown as Zod wrote it,
 * and Zod writes English by default: "Too small: expected string to have >=5
 * characters" under a French label. Zod's French locale fixes the language
 * but still speaks to a developer ("Trop petit : chaîne de caractères doit
 * avoir >=5 caractères", an enum's raw values, a regex's source), so the cases
 * a form actually meets are worded here the way the apps word their own
 * errors, and everything else falls back to that locale.
 *
 * A message the schema words itself (`.min(5, "…")`) always wins: Zod asks
 * the schema first and this map last.
 *
 * Each app calls `configureZodLocale` once at start-up: the site from its
 * server and browser instrumentation (the mobile app's forms show what
 * /api/mobile/* returns, which the site's server words), the console from its
 * server and browser instrumentation (its lesson editors run the components'
 * parsers in the browser), the mobile app from its root layout. Zod keeps the
 * setting on globalThis, so every schema, built before or after the call,
 * reads the same one.
 */
export function configureZodLocale(): void {
  z.config({ localeError: frenchIssueMessage });
}

type RawIssue = z.core.$ZodRawIssue;
type TooSmallIssue = Extract<RawIssue, { code: "too_small" }>;
type TooBigIssue = Extract<RawIssue, { code: "too_big" }>;
type InvalidFormatIssue = Extract<RawIssue, { code: "invalid_format" }>;

const REQUIRED = "Ce champ est obligatoire.";

const zodFrench = z.locales.fr().localeError;

/** The message for an issue the schema did not word: ours, or Zod's French one. */
function frenchIssueMessage(issue: RawIssue): string {
  return ownMessage(issue) ?? sentence(zodFrenchMessage(issue));
}

function ownMessage(issue: RawIssue): string | undefined {
  switch (issue.code) {
    case "invalid_type":
      // A field missing from the body, or read as null from a FormData.
      if (issue.input === undefined || issue.input === null) return REQUIRED;
      if (issue.expected === "number" || issue.expected === "bigint") return "Indique un nombre.";
      if (issue.expected === "int") return "Indique un nombre entier.";
      if (issue.expected === "date") return "Date invalide.";
      return undefined;
    case "too_small":
      return tooSmall(issue);
    case "too_big":
      return tooBig(issue);
    case "invalid_format":
      return invalidFormat(issue);
    case "invalid_value":
      // An enum's values are the code's, not the learner's: never list them.
      // A file written by hand names them itself (schemas/authored-enum.ts).
      return issue.values.length > 1 ? "Choisis une des options proposées." : "Valeur invalide.";
    case "not_multiple_of":
    case "unrecognized_keys":
    case "invalid_union":
    case "invalid_key":
    case "invalid_element":
    case "custom":
      return undefined;
  }
}

function tooSmall(issue: TooSmallIssue): string | undefined {
  const bound = issue.minimum.toString();
  const least = Number(issue.minimum) + (issue.inclusive === false ? 1 : 0);
  switch (issue.origin) {
    case "string":
      if (issue.exact === true) return `${characters(least)} exactement.`;
      // `.min(1)`, `.nonempty()`, or a `.trim()` that left nothing.
      return least <= 1 ? REQUIRED : `${characters(least)} au minimum.`;
    case "array":
    case "set":
      if (issue.exact === true) return `Choisis exactement ${elements(least)}.`;
      return `Choisis au moins ${elements(least)}.`;
    case "number":
    case "int":
    case "bigint":
      return issue.inclusive === false
        ? `Indique un nombre supérieur à ${bound}.`
        : `Indique un nombre supérieur ou égal à ${bound}.`;
    case "date":
      return "Cette date est trop ancienne.";
    case "file":
      return "Ce fichier est trop petit.";
    default:
      return undefined;
  }
}

function tooBig(issue: TooBigIssue): string | undefined {
  const bound = issue.maximum.toString();
  const most = Number(issue.maximum) - (issue.inclusive === false ? 1 : 0);
  switch (issue.origin) {
    case "string":
      if (issue.exact === true) return `${characters(most)} exactement.`;
      return `${characters(most)} au plus.`;
    case "array":
    case "set":
      if (issue.exact === true) return `Choisis exactement ${elements(most)}.`;
      return `Choisis au plus ${elements(most)}.`;
    case "number":
    case "int":
    case "bigint":
      return issue.inclusive === false
        ? `Indique un nombre inférieur à ${bound}.`
        : `Indique un nombre inférieur ou égal à ${bound}.`;
    case "date":
      return "Cette date est trop lointaine.";
    case "file":
      return "Ce fichier est trop lourd.";
    default:
      return undefined;
  }
}

const FORMAT_MESSAGES: Partial<Record<InvalidFormatIssue["format"], string>> = {
  email: "Adresse e-mail invalide.",
  url: "Adresse web invalide.",
  // A regex's source means nothing to the person typing.
  regex: "Format invalide.",
  uuid: "Identifiant invalide.",
  guid: "Identifiant invalide.",
  cuid: "Identifiant invalide.",
  cuid2: "Identifiant invalide.",
  ulid: "Identifiant invalide.",
  nanoid: "Identifiant invalide.",
  date: "Date invalide.",
  datetime: "Date invalide.",
  time: "Heure invalide.",
};

function invalidFormat(issue: InvalidFormatIssue): string | undefined {
  return FORMAT_MESSAGES[issue.format];
}

function characters(count: number): string {
  return count <= 1 ? `${String(count)} caractère` : `${String(count)} caractères`;
}

function elements(count: number): string {
  return count <= 1 ? "un élément" : `${String(count)} éléments`;
}

function zodFrenchMessage(issue: RawIssue): string {
  const message = zodFrench(issue);
  if (typeof message === "string") return message;
  return message?.message ?? "Entrée invalide";
}

/** Zod's French messages start lowercase at times and never end with a full stop. */
function sentence(message: string): string {
  const capitalized = message.charAt(0).toUpperCase() + message.slice(1);
  return /[.!?]$/u.test(capitalized) ? capitalized : `${capitalized}.`;
}
