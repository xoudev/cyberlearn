import { describe, expect, it } from "vitest";
import { parsePasswordLab } from "../password-lab.schema";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

const BASE = {
  id: "lab",
  accounts: [
    { user: "alice", hash: HASH_A },
    { user: "bob", hash: HASH_B, salt: "Xk3p9a" },
  ],
  weak: 1,
};

describe("parsePasswordLab", () => {
  it("reads a table of accounts, salted or not, and the goal", () => {
    const parsed = parsePasswordLab({ ...BASE, title: "La base volée", task: "Casse-la." });
    if (!parsed.ok) throw new Error(parsed.problem);
    expect(parsed.value.accounts).toEqual(BASE.accounts);
    expect(parsed.value.weak).toBe(1);
    expect(parsed.value.question).toBeUndefined();
  });

  it("keeps the closing question with its options, its right answer and its explanation", () => {
    const parsed = parsePasswordLab({
      ...BASE,
      question: "Que protège le mieux ?",
      options: ["Un sel", "Un mot de passe long, un sel et une fonction lente"],
      correct: 1,
      explanation: "Les trois se complètent.",
    });
    if (!parsed.ok) throw new Error(parsed.problem);
    expect(parsed.value.correct).toBe(1);
    expect(parsed.value.options).toHaveLength(2);
  });

  it("reads a hash in capitals or with spaces around it as the lowercase hash it is", () => {
    const parsed = parsePasswordLab({
      ...BASE,
      accounts: [
        { user: "alice", hash: ` ${"A".repeat(64)} ` },
        { user: "bob", hash: HASH_B },
      ],
    });
    if (!parsed.ok) throw new Error(parsed.problem);
    expect(parsed.value.accounts[0]?.hash).toBe(HASH_A);
  });

  it("refuses a hash that is not sixty-four hexadecimal characters, and names the account", () => {
    const parsed = parsePasswordLab({
      ...BASE,
      accounts: [{ user: "alice", hash: "abc" }, BASE.accounts[1]],
    });
    expect(parsed).toMatchObject({
      ok: false,
      problem: expect.stringContaining("accounts.0.hash : ") as string,
    });
  });

  it("refuses a salt with a character a database would not keep, and a table too small", () => {
    expect(
      parsePasswordLab({
        ...BASE,
        accounts: [BASE.accounts[0], { ...BASE.accounts[1], salt: "a b" }],
      }).ok,
    ).toBe(false);
    expect(parsePasswordLab({ ...BASE, accounts: [BASE.accounts[0]] }).ok).toBe(false);
  });

  it("refuses two accounts of the same name, whatever the case", () => {
    expect(
      parsePasswordLab({
        ...BASE,
        accounts: [BASE.accounts[0], { user: "ALICE", hash: HASH_B }],
      }),
    ).toEqual({ ok: false, problem: "deux comptes portent le nom « ALICE »." });
  });

  it("refuses a goal larger than the table", () => {
    expect(parsePasswordLab({ ...BASE, weak: 3 })).toEqual({
      ok: false,
      problem: "weak vaut 3, mais la table n'a que 2 comptes.",
    });
    expect(parsePasswordLab({ ...BASE, weak: 0 }).ok).toBe(false);
  });

  it("wants a question with its options and its right answer, or none of the three", () => {
    expect(parsePasswordLab({ ...BASE, question: "Q ?" })).toEqual({
      ok: false,
      problem: "une question demande ses options et la bonne (correct).",
    });
    expect(parsePasswordLab({ ...BASE, options: ["a", "b"], correct: 0 })).toEqual({
      ok: false,
      problem: "options et correct sont ceux d'une question : écris-la (question).",
    });
  });

  it("holds the right answer to the options, and the options to be different", () => {
    const question = { ...BASE, question: "Q ?" };
    expect(parsePasswordLab({ ...question, options: ["a", "b"], correct: 2 })).toEqual({
      ok: false,
      problem: "correct est l'indice d'une option (la première vaut 0).",
    });
    expect(parsePasswordLab({ ...question, options: ["a", "a"], correct: 0 })).toEqual({
      ok: false,
      problem: "deux options sont identiques.",
    });
    expect(parsePasswordLab({ ...question, options: ["seule"], correct: 0 }).ok).toBe(false);
  });

  it("refuses a prop it does not have, so a typo does not pass for a setting", () => {
    expect(parsePasswordLab({ ...BASE, dictionary: "top10" }).ok).toBe(false);
  });
});
