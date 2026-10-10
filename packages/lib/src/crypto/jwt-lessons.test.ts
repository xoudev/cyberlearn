import { readFileSync } from "node:fs";
import path from "node:path";
import { parseJwtLab } from "@cyberlearn/types";
import { describe, expect, it } from "vitest";
import { componentPropsOf } from "../mdx/check";
import {
  canonicalAttack,
  isAttackLevel,
  isForgery,
  LEVEL_SERVICES,
  replay,
  replayHolds,
  replaysFor,
  verifyAt,
} from "./jwt-lab";

/**
 * Every <JwtLab> of the lessons, played the way the lesson expects: each
 * attack step it offers must work on the flawed service and fail on the
 * corrected one, and the replay it offers must hold. A lab that offered a step
 * no attack could win would leave a learner stuck, and nobody would know
 * before one gave up.
 */

const LESSONS = path.resolve(__dirname, "../../../../content/lessons");

const FILES = [
  "cyber-crypto/13-jwt-forger-et-defendre.mdx",
  "_vitrine/99001-vitrine-des-composants.mdx",
];

describe("the JWT labs of the lessons", () => {
  for (const file of FILES) {
    it(`${file}: each attack step is won by its attack, and stopped once corrected`, async () => {
      const mdx = readFileSync(path.join(LESSONS, file), "utf8")
        .replace(/\r\n/gu, "\n")
        .replace(/^---\n[\s\S]*?\n---\n/u, "");
      const labs = await componentPropsOf(mdx, "JwtLab");
      expect(labs.length).toBeGreaterThan(0);
      for (const props of labs) {
        const parsed = parseJwtLab(props);
        if (!parsed.ok) throw new Error(`${file}: ${parsed.problem}`);
        const attackLevels = parsed.value.levels.filter(isAttackLevel);
        expect(attackLevels.length, `${file}: ${parsed.value.id}`).toBeGreaterThan(0);
        for (const level of attackLevels) {
          for (const service of LEVEL_SERVICES[level]) {
            const attack = canonicalAttack(service);
            expect(isForgery(verifyAt(service, "vulnerable", attack)), `${level} ${service}`).toBe(
              true,
            );
            expect(verifyAt(service, "patched", attack).accepted, `${level} ${service}`).toBe(
              false,
            );
          }
        }
        if (parsed.value.levels.includes("fixed")) {
          for (const entry of replaysFor(parsed.value.levels, {})) {
            expect(replayHolds(entry, replay(entry)), entry.key).toBe(true);
          }
        }
      }
    });
  }
});
