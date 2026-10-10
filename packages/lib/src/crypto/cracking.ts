import type { PasswordLabAccount } from "@cyberlearn/types";
import { utf8Encode } from "./bytes";
import { COMMON_PASSWORDS } from "./common-passwords";
import { sha256Hex } from "./sha256";

/**
 * <PasswordLab>: what a platform stores for a password, the dictionary attack
 * a thief runs against a stolen table of those, and the arithmetic of why
 * length, a salt and a slow function are what stand in the way. The accounts
 * are made-up samples held in a lesson, the dictionary is two hundred
 * generic common passwords, and the only thing computed is a SHA-256 over
 * them: an exercise about why a password falls, not a tool for going after a
 * real system. Everything the bench says is here too, so the site and the
 * app say it alike.
 */

// ── What the platform stores ──────────────────────────────────────────────────

/** What a platform keeps for a password: the SHA-256 of the salt, if any, then the password. */
export function storedHash(password: string, salt?: string): string {
  return sha256Hex(utf8Encode(`${salt ?? ""}${password}`));
}

/** The start of a hash, enough to tell two apart and to see that two are the same. */
export function shortHash(hash: string): string {
  return `${hash.slice(0, 16)}…`;
}

// ── The dictionaries ──────────────────────────────────────────────────────────

export const DICTIONARY_LEVELS = ["top10", "top200", "variants"] as const;
export type DictionaryLevel = (typeof DICTIONARY_LEVELS)[number];

export const DICTIONARY_NAMES: Record<DictionaryLevel, string> = {
  top10: "Les 10 plus courants",
  top200: "200 mots de passe courants",
  variants: "200 courants et leurs variantes",
};

export const DICTIONARY_NOTES: Record<DictionaryLevel, string> = {
  top10:
    "Dix mots de passe que des millions de gens choisissent encore, en tête de toutes les listes de fuites.",
  top200:
    "Les deux cents mots de passe les plus courants, en français et en anglais : des mots, des prénoms, des suites de chiffres, des lignes du clavier.",
  variants:
    "Les deux cents, plus les astuces que presque tout le monde emploie : une majuscule, un chiffre ou une année derrière, un point d'exclamation.",
};

/** What gets glued behind a word, or in front of it as a capital: the "tricks". */
const VARIANT_SUFFIXES = ["1", "12", "123", "1234", "2024", "2025", "!"] as const;

/** How many of the plain words (letters only) get variants: the most common ones. */
const VARIANT_WORDS = 40;

const capitalize = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

/** The word with a capital, then with each suffix, then both: `Soleil`, `soleil2024`, `Soleil2024`. */
export function variantsOf(word: string): string[] {
  const capital = capitalize(word);
  return [
    capital,
    ...VARIANT_SUFFIXES.map((suffix) => `${word}${suffix}`),
    ...VARIANT_SUFFIXES.map((suffix) => `${capital}${suffix}`),
  ];
}

const candidateCache = new Map<DictionaryLevel, readonly string[]>();

/** The guesses of a dictionary, in the order the attack tries them, each once. */
export function candidatesFor(level: DictionaryLevel): readonly string[] {
  const cached = candidateCache.get(level);
  if (cached !== undefined) return cached;
  let list: string[];
  if (level === "top10") {
    list = COMMON_PASSWORDS.slice(0, 10);
  } else if (level === "top200") {
    list = [...COMMON_PASSWORDS];
  } else {
    const words = COMMON_PASSWORDS.filter((word) => /^[a-z]+$/u.test(word)).slice(0, VARIANT_WORDS);
    list = [...COMMON_PASSWORDS, ...words.flatMap(variantsOf)];
  }
  const unique = [...new Set(list)];
  candidateCache.set(level, unique);
  return unique;
}

// ── The attack ────────────────────────────────────────────────────────────────

export const ATTACK_METHODS = ["table", "each"] as const;
export type AttackMethod = (typeof ATTACK_METHODS)[number];

export const METHOD_NAMES: Record<AttackMethod, string> = {
  table: "Table pré-calculée",
  each: "Compte par compte",
};

export const METHOD_NOTES: Record<AttackMethod, string> = {
  table:
    "On calcule une fois l'empreinte de chaque mot du dictionnaire, puis on cherche les empreintes volées dans cette table : le même travail sert à tous les comptes.",
  each: "On reprend le dictionnaire pour chaque compte, en ajoutant le sel de ce compte devant chaque mot : le travail se refait autant de fois qu'il y a de comptes.",
};

export interface CrackedAccount {
  readonly user: string;
  /** The password the dictionary found. */
  readonly password: string;
  /** How many guesses it took: the word's rank in the dictionary. */
  readonly tries: number;
}

export interface AttackResult {
  readonly level: DictionaryLevel;
  readonly method: AttackMethod;
  /** How many words the dictionary holds. */
  readonly words: number;
  readonly cracked: readonly CrackedAccount[];
  /** How many SHA-256 were computed, all accounts together. */
  readonly hashes: number;
}

/**
 * A dictionary attack on a stolen table. `table` hashes the dictionary once
 * and looks every stolen hash up in it, which finds the unsalted accounts at
 * the price of one pass and finds none of the salted ones: their hash is of
 * the salt and the word, and no table was built for that salt. `each` goes
 * account by account with the account's own salt, and stops at the first word
 * that matches: a salted account falls, at the price of a pass of its own.
 */
export function runAttack(
  accounts: readonly PasswordLabAccount[],
  level: DictionaryLevel,
  method: AttackMethod,
): AttackResult {
  const list = candidatesFor(level);
  const cracked: CrackedAccount[] = [];
  let hashes = 0;
  if (method === "table") {
    const table = new Map<string, { word: string; rank: number }>();
    list.forEach((word, index) => {
      const hash = storedHash(word);
      if (!table.has(hash)) table.set(hash, { word, rank: index + 1 });
    });
    hashes = list.length;
    for (const account of accounts) {
      const hit = table.get(account.hash);
      if (hit !== undefined) {
        cracked.push({ user: account.user, password: hit.word, tries: hit.rank });
      }
    }
  } else {
    for (const account of accounts) {
      let tries = 0;
      for (const word of list) {
        tries++;
        if (storedHash(word, account.salt) === account.hash) {
          cracked.push({ user: account.user, password: word, tries });
          break;
        }
      }
      hashes += tries;
    }
  }
  return { level, method, words: list.length, cracked, hashes };
}

/** The users the whole dictionary breaks, account by account: the exercise's goal, counted. */
export function crackableUsers(accounts: readonly PasswordLabAccount[]): string[] {
  return runAttack(accounts, "variants", "each").cracked.map((found) => found.user);
}

// ── What the bench says ───────────────────────────────────────────────────────

const FIGURE_SPACE = " ";

/** An integer in French digits, groups of three apart by a narrow no-break space. */
export function groupDigits(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/gu, FIGURE_SPACE);
}

const SUPERSCRIPT = "⁰¹²³⁴⁵⁶⁷⁸⁹";

/**
 * A count the reader can size up: plain digits up to a billion, then
 * `6,1 × 10¹⁵`.
 */
export function formatCount(n: number): string {
  if (n < 1e9) return groupDigits(n);
  let exponent = Math.floor(Math.log10(n));
  let mantissa = Math.round((n / 10 ** exponent) * 10) / 10;
  if (mantissa >= 10) {
    mantissa /= 10;
    exponent += 1;
  }
  const power = Array.from(String(exponent), (digit) => SUPERSCRIPT.charAt(Number(digit))).join("");
  return `${String(mantissa).replace(".", ",")} × 10${power}`;
}

/** "Alice", "alice et bob", "alice, bob et chloé". */
export function joinNames(names: readonly string[]): string {
  if (names.length < 2) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} et ${names[names.length - 1] ?? ""}`;
}

const plural = (n: number, one: string, many: string): string =>
  `${groupDigits(n)} ${n < 2 ? one : many}`;

/** One line for a run: which dictionary, which method, how it went and what it cost. */
export function runSummary(result: AttackResult, total: number): string {
  return `${DICTIONARY_NAMES[result.level]}, ${METHOD_NAMES[result.method].toLowerCase()} : ${plural(
    result.cracked.length,
    "compte cassé",
    "comptes cassés",
  )} sur ${groupDigits(total)}, ${plural(result.hashes, "calcul de hash", "calculs de hash")}.`;
}

/** The groups of users whose stored hashes are equal: the same password, with nothing cracked. */
export function sharedHashGroups(accounts: readonly PasswordLabAccount[]): string[][] {
  const byHash = new Map<string, string[]>();
  for (const account of accounts) {
    byHash.set(account.hash, [...(byHash.get(account.hash) ?? []), account.user]);
  }
  return [...byHash.values()].filter((users) => users.length > 1);
}

/**
 * What the table says on its own, then what the cracked accounts add: the
 * accounts that share a hash share a password; the ones that share a password
 * without sharing a hash are the salt at work.
 */
export function observations(
  accounts: readonly PasswordLabAccount[],
  cracked: readonly CrackedAccount[],
): string[] {
  const lines = sharedHashGroups(accounts).map(
    (users) =>
      `${joinNames(users)} ont la même empreinte : sans rien casser, on sait déjà qu'ils ont le même mot de passe.`,
  );
  const hashOf = new Map(accounts.map((account) => [account.user, account.hash]));
  const byPassword = new Map<string, string[]>();
  for (const found of cracked) {
    byPassword.set(found.password, [...(byPassword.get(found.password) ?? []), found.user]);
  }
  for (const [password, users] of byPassword) {
    const hashes = new Set(users.map((user) => hashOf.get(user)));
    if (users.length > 1 && hashes.size > 1) {
      lines.push(
        `${joinNames(users)} ont le même mot de passe (${password}), et pourtant pas la même empreinte : c'est l'effet du sel.`,
      );
    }
  }
  return lines;
}

// ── Length and slowness ───────────────────────────────────────────────────────

export const ALPHABET_IDS = ["digits", "lower", "letters", "alnum", "all", "words"] as const;
export type AlphabetId = (typeof ALPHABET_IDS)[number];

export interface Alphabet {
  readonly id: AlphabetId;
  readonly label: string;
  /** How many symbols a position can take. */
  readonly size: number;
  readonly unit: string;
  readonly unitMany: string;
  /** The longest password the calculator draws. */
  readonly max: number;
}

const characters = (id: AlphabetId, label: string, size: number): Alphabet => ({
  id,
  label,
  size,
  unit: "caractère",
  unitMany: "caractères",
  max: 24,
});

export const ALPHABET: Record<AlphabetId, Alphabet> = {
  digits: characters("digits", "chiffres", 10),
  lower: characters("lower", "minuscules", 26),
  letters: characters("letters", "minuscules et majuscules", 52),
  alnum: characters("alnum", "lettres et chiffres", 62),
  all: characters("all", "tout le clavier", 94),
  // A passphrase: words drawn from a list of 7 776, as a dice-throw list holds.
  words: {
    id: "words",
    label: "mots d'une liste de 7 776",
    size: 7776,
    unit: "mot",
    unitMany: "mots",
    max: 10,
  },
};

export const ALPHABETS: readonly Alphabet[] = ALPHABET_IDS.map((id) => ALPHABET[id]);

export const FUNCTION_IDS = ["sha256", "bcrypt", "argon2id"] as const;
export type FunctionId = (typeof FUNCTION_IDS)[number];

export interface GuessFunction {
  readonly id: FunctionId;
  readonly label: string;
  /** Guesses a day-to-day graphics card makes in a second: an order of magnitude. */
  readonly perSecond: number;
  readonly rate: string;
  readonly note: string;
}

/**
 * Orders of magnitude for one consumer graphics card, rounded to a power of
 * ten or to a round number: not benchmarks, and the bench says so. What
 * matters is the ratio: seven orders of magnitude between the first line and
 * the others.
 */
export const GUESS_FUNCTION: Record<FunctionId, GuessFunction> = {
  sha256: {
    id: "sha256",
    label: "SHA-256 seul",
    perSecond: 1e10,
    rate: "10 milliards d'essais par seconde",
    note: "Faite pour aller vite : parfait pour vérifier un fichier, désastreux pour un mot de passe.",
  },
  bcrypt: {
    id: "bcrypt",
    label: "bcrypt, coût 12",
    perSecond: 1e3,
    rate: "1 000 essais par seconde",
    note: "Faite pour être lente : chaque essai demande 4 096 tours de calcul (2 puissance 12), et chaque point de coût en plus double le travail.",
  },
  argon2id: {
    id: "argon2id",
    label: "argon2id, 64 Mo",
    perSecond: 500,
    rate: "500 essais par seconde",
    note: "Lente et gourmande : chaque essai réserve 64 Mo de mémoire, ce qui empêche une carte graphique d'en lancer des milliers à la fois.",
  },
};

export const GUESS_FUNCTIONS: readonly GuessFunction[] = FUNCTION_IDS.map(
  (id) => GUESS_FUNCTION[id],
);

/** How many passwords of `length` symbols there are over an alphabet of `size`. */
export function combinations(size: number, length: number): number {
  return size ** length;
}

const YEAR = 365.25 * 86_400;
const UNIVERSE_YEARS = 13.8e9;

const UNITS = [
  { seconds: 1, one: "seconde", many: "secondes", rolls: 60 },
  { seconds: 60, one: "minute", many: "minutes", rolls: 60 },
  { seconds: 3_600, one: "heure", many: "heures", rolls: 24 },
  { seconds: 86_400, one: "jour", many: "jours", rolls: 365 },
] as const;

/** A number with one decimal at most, a comma for the point: `1,5`, `12`. */
function decimal(x: number): string {
  return x >= 10 ? String(Math.round(x)) : String(Number(x.toFixed(1))).replace(".", ",");
}

/** `x` to its two first significant figures: 193166 gives 190000. */
function roundTwoFigures(x: number): number {
  const step = 10 ** (Math.floor(Math.log10(x)) - 1);
  return Math.round(x / step) * step;
}

/** A length of time the reader can feel, from "moins d'une seconde" to the age of the universe. */
export function formatDuration(seconds: number): string {
  if (!(seconds >= 1)) return "moins d'une seconde";
  for (const unit of UNITS) {
    const n = Math.round(seconds / unit.seconds);
    if (n < unit.rolls) return plural(n, unit.one, unit.many);
  }
  const years = seconds / YEAR;
  if (years >= UNIVERSE_YEARS) return "plus que l'âge de l'univers";
  if (years < 1_000) return plural(Math.max(1, Math.round(years)), "an", "ans");
  if (years < 1e6) return `${groupDigits(roundTwoFigures(years))} ans`;
  if (years < 1e9) {
    return `${decimal(years / 1e6)} ${years / 1e6 < 2 ? "million" : "millions"} d'années`;
  }
  return `${decimal(years / 1e9)} ${years / 1e9 < 2 ? "milliard" : "milliards"} d'années`;
}

/** How long it takes to try `count` guesses at `perSecond`. */
export function secondsToTry(count: number, perSecond: number): number {
  return count / perSecond;
}

export type Strength = "weak" | "fair" | "strong";

export const STRENGTH_LABELS: Record<Strength, string> = {
  weak: "Tombe dans la journée",
  fair: "Tient des jours ou des années, pas davantage",
  strong: "Hors de portée",
};

/** How the time to try everything reads: a day, a century. */
export function strengthOf(seconds: number): Strength {
  if (seconds < 86_400) return "weak";
  return seconds < 100 * YEAR ? "fair" : "strong";
}

export interface Estimate {
  readonly combinations: string;
  readonly rate: string;
  readonly duration: string;
  readonly strength: Strength;
}

/** The bench's reading of a password shape and a way of storing it. */
export function estimate(alphabet: Alphabet, length: number, guess: GuessFunction): Estimate {
  const seconds = secondsToTry(combinations(alphabet.size, length), guess.perSecond);
  return {
    combinations: formatCount(combinations(alphabet.size, length)),
    rate: guess.rate,
    duration: formatDuration(seconds),
    strength: strengthOf(seconds),
  };
}

/** A real dictionary of leaked passwords, in round numbers: fourteen million words. */
export const REAL_DICTIONARY = 14_000_000;

/** The tricks of the variants, a thousand to a word: the usual reach of an attacker's rules. */
export const REAL_VARIANTS_PER_WORD = 1_000;

export interface DictionaryRow {
  readonly label: string;
  readonly duration: string;
}

/** What a real dictionary costs with this way of storing passwords, plain and with its variants. */
export function realDictionaryRows(guess: GuessFunction): DictionaryRow[] {
  return [
    {
      label: "Un vrai dictionnaire de 14 millions de mots de passe issus de fuites",
      duration: formatDuration(secondsToTry(REAL_DICTIONARY, guess.perSecond)),
    },
    {
      label: "Le même, avec ses variantes (mille par mot)",
      duration: formatDuration(
        secondsToTry(REAL_DICTIONARY * REAL_VARIANTS_PER_WORD, guess.perSecond),
      ),
    },
  ];
}
