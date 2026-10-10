import { createHash } from "node:crypto";
import type { PasswordLabAccount } from "@cyberlearn/types";
import { describe, expect, it } from "vitest";
import { COMMON_PASSWORDS } from "./common-passwords";
import {
  ALPHABET,
  ALPHABETS,
  candidatesFor,
  combinations,
  crackableUsers,
  estimate,
  formatCount,
  formatDuration,
  GUESS_FUNCTION,
  groupDigits,
  joinNames,
  observations,
  realDictionaryRows,
  runAttack,
  runSummary,
  secondsToTry,
  sharedHashGroups,
  shortHash,
  storedHash,
  strengthOf,
  variantsOf,
} from "./cracking";

/**
 * The attack against hashes the test builds itself, and the figures the bench
 * shows against arithmetic done by hand: a bench that disagreed with the
 * lesson's table would teach the wrong thing.
 */

const sha256 = (text: string): string => createHash("sha256").update(text, "utf8").digest("hex");

/** An account whose password the test knows. */
const account = (user: string, password: string, salt?: string): PasswordLabAccount => ({
  user,
  hash: storedHash(password, salt),
  ...(salt === undefined ? {} : { salt }),
});

const TABLE: PasswordLabAccount[] = [
  account("alice", "123456"),
  account("bob", "123456"),
  account("chloe", "soleil"),
  account("dylan", "Dragon2024"),
  account("emma", "azerty123"),
  account("farid", "k9#Qz2vL"),
  account("hugo", "azerty", "Xk3p9a"),
  account("ines", "azerty", "7QmZ2d"),
  account("jules", "trois pommes rouges sur la table", "Pq8Wn1"),
];

describe("storedHash", () => {
  it("is the SHA-256 of the salt then the password, as any other implementation computes it", () => {
    expect(storedHash("abc")).toBe(sha256("abc"));
    expect(storedHash("azerty", "Xk3p9a")).toBe(sha256("Xk3p9aazerty"));
    expect(storedHash("été à l'ombre")).toBe(sha256("été à l'ombre"));
  });

  it("gives one password two hashes under two salts, and the same hash without", () => {
    expect(storedHash("azerty", "Xk3p9a")).not.toBe(storedHash("azerty", "7QmZ2d"));
    expect(storedHash("azerty", "Xk3p9a")).not.toBe(storedHash("azerty"));
    expect(storedHash("azerty")).toBe(storedHash("azerty"));
  });

  it("shows the start of a hash, enough to compare two", () => {
    expect(shortHash(storedHash("abc"))).toBe("ba7816bf8f01cfea…");
  });
});

describe("the dictionaries", () => {
  it("hold two hundred common passwords, each once, most common first", () => {
    expect(COMMON_PASSWORDS).toHaveLength(200);
    expect(new Set(COMMON_PASSWORDS).size).toBe(200);
    expect(COMMON_PASSWORDS.slice(0, 4)).toEqual(["123456", "password", "123456789", "azerty"]);
    for (const word of COMMON_PASSWORDS) expect(word).toMatch(/^[a-z0-9]+$/u);
  });

  it("start from the ten, then the two hundred, then the tricks", () => {
    expect(candidatesFor("top10")).toEqual(COMMON_PASSWORDS.slice(0, 10));
    expect(candidatesFor("top200")).toEqual(COMMON_PASSWORDS);
    const variants = candidatesFor("variants");
    expect(variants.slice(0, 200)).toEqual(COMMON_PASSWORDS);
    expect(variants.length).toBeGreaterThan(700);
    expect(new Set(variants).size).toBe(variants.length);
    for (const guess of ["Soleil", "soleil2024", "Dragon2024", "azerty123", "Bonjour!"]) {
      expect(variants).toContain(guess);
    }
    // The tricks stop at the most common words: a number pattern gets none.
    expect(variants).not.toContain("1234562024");
  });

  it("write a word's variants: capital, suffixes, capital and suffixes", () => {
    const soleil = variantsOf("soleil");
    expect(soleil[0]).toBe("Soleil");
    expect(soleil).toContain("soleil1234");
    expect(soleil).toContain("Soleil!");
    expect(soleil).toHaveLength(15);
  });
});

describe("runAttack with a table computed in advance", () => {
  it("finds every account without a salt in a single pass, and none of the salted ones", () => {
    const result = runAttack(TABLE, "top200", "table");
    expect(result.cracked).toEqual([
      { user: "alice", password: "123456", tries: 1 },
      { user: "bob", password: "123456", tries: 1 },
      { user: "chloe", password: "soleil", tries: 11 },
    ]);
    // One hash per word of the dictionary, whatever the number of accounts.
    expect(result.hashes).toBe(200);
    expect(result.words).toBe(200);
  });

  it("is stopped by the salt: the same password, salted, is not in the table", () => {
    const unsalted = [account("a", "azerty"), account("b", "azerty", "Xk3p9a")];
    const result = runAttack(unsalted, "top10", "table");
    expect(result.cracked.map((found) => found.user)).toEqual(["a"]);
  });

  it("takes the tricks only from the third dictionary", () => {
    expect(runAttack(TABLE, "top200", "table").cracked.map((c) => c.user)).not.toContain("dylan");
    const all = runAttack(TABLE, "variants", "table").cracked.map((found) => found.user);
    expect(all).toEqual(["alice", "bob", "chloe", "dylan", "emma"]);
  });
});

describe("runAttack account by account", () => {
  it("breaks a salted account with its own salt, at the price of its own pass", () => {
    const result = runAttack(TABLE, "top10", "each");
    expect(result.cracked).toEqual([
      { user: "alice", password: "123456", tries: 1 },
      { user: "bob", password: "123456", tries: 1 },
      { user: "hugo", password: "azerty", tries: 4 },
      { user: "ines", password: "azerty", tries: 4 },
    ]);
    // Five accounts stand: ten guesses each, and the four that fell stopped early.
    expect(result.hashes).toBe(1 + 1 + 10 + 10 + 10 + 10 + 4 + 4 + 10);
  });

  it("costs a whole pass for an account that resists", () => {
    const resisting = [account("farid", "k9#Qz2vL")];
    const result = runAttack(resisting, "top200", "each");
    expect(result.cracked).toEqual([]);
    expect(result.hashes).toBe(200);
  });

  it("costs more than the table as soon as there are several accounts to go through", () => {
    const table = runAttack(TABLE, "variants", "table");
    const each = runAttack(TABLE, "variants", "each");
    expect(each.hashes).toBeGreaterThan(table.hashes * 2);
    expect(each.cracked.length).toBeGreaterThan(table.cracked.length);
  });

  it("leaves a long passphrase and a short random password out of the dictionary", () => {
    expect(crackableUsers(TABLE)).toEqual([
      "alice",
      "bob",
      "chloe",
      "dylan",
      "emma",
      "hugo",
      "ines",
    ]);
  });
});

describe("what the bench says", () => {
  it("groups digits and sizes up big counts", () => {
    expect(groupDigits(1234567)).toBe("1 234 567");
    expect(groupDigits(999)).toBe("999");
    expect(formatCount(4096)).toBe("4 096");
    expect(formatCount(combinations(94, 8))).toBe("6,1 × 10¹⁵");
    expect(formatCount(combinations(26, 8))).toBe("2,1 × 10¹¹");
    expect(formatCount(1e12)).toBe("1 × 10¹²");
    expect(formatCount(9.96e11)).toBe("1 × 10¹²");
  });

  it("names a group of users", () => {
    expect(joinNames([])).toBe("");
    expect(joinNames(["alice"])).toBe("alice");
    expect(joinNames(["alice", "bob"])).toBe("alice et bob");
    expect(joinNames(["alice", "bob", "chloe"])).toBe("alice, bob et chloe");
  });

  it("sums a run up in one line, singular and plural", () => {
    expect(runSummary(runAttack(TABLE, "top10", "table"), TABLE.length)).toBe(
      "Les 10 plus courants, table pré-calculée : 2 comptes cassés sur 9, 10 calculs de hash.",
    );
    expect(runSummary(runAttack([account("a", "123456")], "top10", "each"), 1)).toBe(
      "Les 10 plus courants, compte par compte : 1 compte cassé sur 1, 1 calcul de hash.",
    );
  });

  it("sees a shared password in a shared hash, without cracking anything", () => {
    expect(sharedHashGroups(TABLE)).toEqual([["alice", "bob"]]);
    expect(observations(TABLE, [])).toEqual([
      "alice et bob ont la même empreinte : sans rien casser, on sait déjà qu'ils ont le même mot de passe.",
    ]);
  });

  it("points at the salt once two accounts with one password have fallen with two hashes", () => {
    const cracked = runAttack(TABLE, "top10", "each").cracked;
    expect(observations(TABLE, cracked)).toEqual([
      "alice et bob ont la même empreinte : sans rien casser, on sait déjà qu'ils ont le même mot de passe.",
      "hugo et ines ont le même mot de passe (azerty), et pourtant pas la même empreinte : c'est l'effet du sel.",
    ]);
  });
});

describe("length and slowness", () => {
  it("counts the passwords of a shape", () => {
    expect(combinations(10, 4)).toBe(10_000);
    expect(combinations(94, 8)).toBeCloseTo(6.0957e15, -11);
    expect(ALPHABETS.map((alphabet) => alphabet.size)).toEqual([10, 26, 52, 62, 94, 7776]);
    expect(ALPHABET.words.unitMany).toBe("mots");
  });

  it("writes a time the reader can feel, in French", () => {
    expect(formatDuration(0.3)).toBe("moins d'une seconde");
    expect(formatDuration(1)).toBe("1 seconde");
    expect(formatDuration(21)).toBe("21 secondes");
    expect(formatDuration(59.6)).toBe("1 minute");
    expect(formatDuration(5_400)).toBe("2 heures");
    expect(formatDuration(86_400 * 7)).toBe("7 jours");
    expect(formatDuration(86_400 * 364.6)).toBe("1 an");
    expect(formatDuration(3.15576e7 * 193_000)).toBe("190 000 ans");
    expect(formatDuration(3.15576e7 * 1_500_000)).toBe("1,5 million d'années");
    expect(formatDuration(3.15576e7 * 2.5e6)).toBe("2,5 millions d'années");
    expect(formatDuration(3.15576e7 * 4.2e9)).toBe("4,2 milliards d'années");
    expect(formatDuration(3.15576e7 * 1e11)).toBe("plus que l'âge de l'univers");
  });

  it("shows why length counts: eight characters fall in a week, ten take two centuries", () => {
    const sha = GUESS_FUNCTION.sha256;
    expect(estimate(ALPHABET.lower, 6, sha).duration).toBe("moins d'une seconde");
    expect(estimate(ALPHABET.lower, 8, sha).duration).toBe("21 secondes");
    expect(estimate(ALPHABET.all, 8, sha)).toEqual({
      combinations: "6,1 × 10¹⁵",
      rate: "10 milliards d'essais par seconde",
      duration: "7 jours",
      strength: "fair",
    });
    expect(estimate(ALPHABET.all, 10, sha).duration).toBe("171 ans");
    expect(estimate(ALPHABET.all, 12, sha).duration).toBe("1,5 million d'années");
  });

  it("shows why slowness counts: the same eight characters, ten million times further", () => {
    const eight = estimate(ALPHABET.all, 8, GUESS_FUNCTION.bcrypt);
    expect(eight.duration).toBe("190 000 ans");
    expect(eight.strength).toBe("strong");
    expect(estimate(ALPHABET.lower, 8, GUESS_FUNCTION.bcrypt).duration).toBe("7 ans");
    expect(estimate(ALPHABET.all, 8, GUESS_FUNCTION.argon2id).duration).toBe("390 000 ans");
  });

  it("shows a passphrase of words beating a short password of symbols", () => {
    const sha = GUESS_FUNCTION.sha256;
    const words = estimate(ALPHABET.words, 6, sha);
    expect(words.duration).toBe("700 000 ans");
    expect(words.strength).toBe("strong");
    expect(estimate(ALPHABET.words, 4, sha).duration).toBe("4 jours");
    expect(estimate(ALPHABET.words, 5, sha).duration).toBe("90 ans");
  });

  it("gives the table the lesson prints, row by row", () => {
    // The lesson (cyber-crypto/13) quotes these figures: they must not drift from the bench.
    const rows = [
      [ALPHABET.lower, 8],
      [ALPHABET.all, 8],
      [ALPHABET.all, 12],
      [ALPHABET.words, 4],
      [ALPHABET.words, 6],
    ] as const;
    const read = (guess: (typeof GUESS_FUNCTION)["sha256"]): string[][] =>
      rows.map(([alphabet, length]) => {
        const reading = estimate(alphabet, length, guess);
        return [reading.combinations, reading.duration];
      });
    expect(read(GUESS_FUNCTION.sha256)).toEqual([
      ["2,1 × 10¹¹", "21 secondes"],
      ["6,1 × 10¹⁵", "7 jours"],
      ["4,8 × 10²³", "1,5 million d'années"],
      ["3,7 × 10¹⁵", "4 jours"],
      ["2,2 × 10²³", "700 000 ans"],
    ]);
    expect(read(GUESS_FUNCTION.bcrypt).map(([, duration]) => duration)).toEqual([
      "7 ans",
      "190 000 ans",
      "plus que l'âge de l'univers",
      "120 000 ans",
      "plus que l'âge de l'univers",
    ]);
  });

  it("sets the price of a real dictionary, plain and with its variants, by storage", () => {
    expect(realDictionaryRows(GUESS_FUNCTION.sha256).map((row) => row.duration)).toEqual([
      "moins d'une seconde",
      "1 seconde",
    ]);
    expect(realDictionaryRows(GUESS_FUNCTION.bcrypt).map((row) => row.duration)).toEqual([
      "4 heures",
      "162 jours",
    ]);
    expect(realDictionaryRows(GUESS_FUNCTION.argon2id).map((row) => row.duration)).toEqual([
      "8 heures",
      "324 jours",
    ]);
  });

  it("grades a time: a day, a century", () => {
    expect(secondsToTry(1e10, 1e10)).toBe(1);
    expect(strengthOf(3_600)).toBe("weak");
    expect(strengthOf(86_400 * 30)).toBe("fair");
    expect(strengthOf(3.15576e7 * 1_000)).toBe("strong");
  });
});
