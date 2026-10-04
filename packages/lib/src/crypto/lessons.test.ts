import { readFileSync } from "node:fs";
import path from "node:path";
import { parseCryptoWorkshop } from "@cyberlearn/types";
import { describe, expect, it } from "vitest";
import { componentPropsOf } from "../mdx/check";
import { isAnswer, runTool, type ToolRun } from "./workshop";

/**
 * Every <CryptoWorkshop> challenge of the lessons, solved the way the lesson
 * expects: the ciphertext put through the right tool with the right key must
 * give the answer. A challenge whose ciphertext was mistyped would be
 * unsolvable, and nobody would know before a learner gave up.
 */

const LESSONS = path.resolve(__dirname, "../../../../content/lessons");

const FILES = [
  "cyber-crypto/02-chiffrement-symetrique.mdx",
  "cyber-crypto/04-fonctions-hachage.mdx",
  "cyber-crypto/12-projet-casser-chiffrement.mdx",
  "f1-fondamentaux/01014-compression-et-formats.mdx",
];

/** How each challenge is meant to be solved: the tool, its direction and its key. */
const SOLUTIONS: Record<string, Omit<ToolRun, "input">> = {
  "atelier-xor": { tool: "xor", direction: "decode", key: "42" },
  "atelier-sha256": { tool: "sha256", direction: "encode", key: "" },
  "atelier-classiques": { tool: "caesar", direction: "decode", key: "9" },
  "atelier-base64": { tool: "base64", direction: "decode", key: "" },
};

describe("the crypto workshops of the lessons", () => {
  for (const file of FILES) {
    it(`${file}: each challenge is solved by its tool`, async () => {
      const mdx = readFileSync(path.join(LESSONS, file), "utf8")
        .replace(/\r\n/gu, "\n")
        .replace(/^---\n[\s\S]*?\n---\n/u, "");
      const workshops = await componentPropsOf(mdx, "CryptoWorkshop");
      expect(workshops.length).toBeGreaterThan(0);
      for (const props of workshops) {
        const parsed = parseCryptoWorkshop(props);
        if (!parsed.ok) throw new Error(`${file}: ${parsed.problem}`);
        const { id, challenge } = parsed.value;
        if (challenge === undefined) continue;
        const solution = SOLUTIONS[id];
        if (solution === undefined) throw new Error(`${file}: no solution written for ${id}`);
        if (solution.tool === "sha256") {
          // A digest is not deciphered: the answer must hash to it.
          const hashed = runTool({ ...solution, input: challenge.answer });
          expect(hashed).toEqual({ ok: true, output: challenge.ciphertext });
        } else {
          const result = runTool({ ...solution, input: challenge.ciphertext });
          if (!result.ok) throw new Error(`${file}: ${id}: ${result.problem}`);
          expect(isAnswer(challenge.answer, result.output)).toBe(true);
        }
        expect(parsed.value.tools).toContain(solution.tool);
      }
    });
  }
});
