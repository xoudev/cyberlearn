import { readFileSync } from "node:fs";
import path from "node:path";
import { parsePasswordLab } from "@cyberlearn/types";
import { describe, expect, it } from "vitest";
import { componentPropsOf } from "../mdx/check";
import {
  crackableUsers,
  runAttack,
  storedHash,
  type AttackMethod,
  type DictionaryLevel,
} from "./cracking";

/**
 * Every <PasswordLab> of the lessons, played the way the exercise is meant to
 * be: the table must be one the dictionary can break exactly as many accounts
 * of as the lesson says, and the lesson's own story (what falls to which
 * dictionary and which method) must hold. A table edited without replaying it
 * could make the goal unreachable, or hand the answer to the first click, and
 * nobody would know before a learner gave up.
 */

const LESSONS = path.resolve(__dirname, "../../../../content/lessons");

const FILES = [
  "cyber-crypto/13-atelier-casser-mots-de-passe.mdx",
  "_vitrine/99001-vitrine-des-composants.mdx",
];

type Attack = `${DictionaryLevel}/${AttackMethod}`;

/** For the lab of the lesson: who falls to each attack, and who resists them all. */
const STORY: Record<string, { falls: Partial<Record<Attack, string[]>>; resists: string[] }> = {
  "mdp-base-volee": {
    falls: {
      // The table finds every account without a salt that is in the list, and no salted one.
      "top10/table": ["alice", "bob"],
      "top200/table": ["alice", "bob", "chloe"],
      "variants/table": ["alice", "bob", "chloe", "dylan", "emma"],
      // Account by account, the salted accounts fall too.
      "top10/each": ["alice", "bob", "hugo", "ines"],
      "top200/each": ["alice", "bob", "chloe", "hugo", "ines"],
      "variants/each": ["alice", "bob", "chloe", "dylan", "emma", "hugo", "ines"],
    },
    resists: ["farid", "gaelle", "jules"],
  },
  "mdp-vitrine-base-volee": {
    falls: {
      "top10/table": ["alice"],
      "top10/each": ["alice", "hugo"],
      "variants/each": ["alice", "hugo"],
    },
    resists: ["farid"],
  },
};

describe("the password labs of the lessons", () => {
  for (const file of FILES) {
    it(`${file}: each table breaks as the lesson says`, async () => {
      const mdx = readFileSync(path.join(LESSONS, file), "utf8")
        .replace(/\r\n/gu, "\n")
        .replace(/^---\n[\s\S]*?\n---\n/u, "");
      const labs = await componentPropsOf(mdx, "PasswordLab");
      expect(labs.length).toBeGreaterThan(0);
      for (const props of labs) {
        const parsed = parsePasswordLab(props);
        if (!parsed.ok) throw new Error(`${file}: ${parsed.problem}`);
        const { id, accounts, weak } = parsed.value;
        const story = STORY[id];
        if (story === undefined) throw new Error(`${file}: no story written for ${id}`);

        // The goal is exactly what the whole dictionary breaks.
        const falling = crackableUsers(accounts);
        expect(falling.length, id).toBe(weak);
        expect(
          accounts.map((a) => a.user).filter((u) => !falling.includes(u)),
          id,
        ).toEqual(story.resists);

        for (const [attack, users] of Object.entries(story.falls)) {
          const [level, method] = attack.split("/") as [DictionaryLevel, AttackMethod]; // the keys of STORY are typed Attack
          const result = runAttack(accounts, level, method);
          expect(
            result.cracked.map((found) => found.user),
            `${id} ${attack}`,
          ).toEqual(users);
          // What the bench shows is what the account stores.
          for (const found of result.cracked) {
            const account = accounts.find((a) => a.user === found.user);
            expect(storedHash(found.password, account?.salt)).toBe(account?.hash);
          }
        }
      }
    });
  }

  it("keeps the lesson's table an exercise: salted accounts differ, unsalted twins do not", async () => {
    const mdx = readFileSync(path.join(LESSONS, FILES[0] ?? ""), "utf8")
      .replace(/\r\n/gu, "\n")
      .replace(/^---\n[\s\S]*?\n---\n/u, "");
    const [props] = await componentPropsOf(mdx, "PasswordLab");
    const parsed = parsePasswordLab(props);
    if (!parsed.ok) throw new Error(parsed.problem);
    const byUser = new Map(parsed.value.accounts.map((a) => [a.user, a]));
    expect(byUser.get("alice")?.hash).toBe(byUser.get("bob")?.hash);
    expect(byUser.get("hugo")?.hash).not.toBe(byUser.get("ines")?.hash);
    expect(byUser.get("hugo")?.salt).not.toBe(byUser.get("ines")?.salt);
  });
});
