import { describe, expect, it } from "vitest";
import { flagsMatch, personalFlag } from "../flag";

const SECRET = "a".repeat(64);
const CHALLENGE = "11111111-1111-4111-8111-111111111111";
const ALICE = "22222222-2222-4222-8222-222222222222";
const BOB = "33333333-3333-4333-8333-333333333333";

describe("personalFlag", () => {
  it("is the same for the same learner, every time", () => {
    expect(personalFlag(SECRET, CHALLENGE, ALICE)).toBe(personalFlag(SECRET, CHALLENGE, ALICE));
    expect(personalFlag(SECRET, CHALLENGE, ALICE)).toMatch(/^CL\{[0-9a-f]{20}\}$/);
  });

  it("differs from one learner to another, so a shared flag is worth nothing", () => {
    expect(personalFlag(SECRET, CHALLENGE, ALICE)).not.toBe(personalFlag(SECRET, CHALLENGE, BOB));
  });

  it("differs from one challenge to another, and with another key", () => {
    const other = "44444444-4444-4444-8444-444444444444";
    expect(personalFlag(SECRET, CHALLENGE, ALICE)).not.toBe(personalFlag(SECRET, other, ALICE));
    expect(personalFlag(SECRET, CHALLENGE, ALICE)).not.toBe(
      personalFlag("b".repeat(64), CHALLENGE, ALICE),
    );
  });
});

describe("flagsMatch", () => {
  const flag = personalFlag(SECRET, CHALLENGE, ALICE);

  it("accepts the flag, with spaces around or in capitals", () => {
    expect(flagsMatch(flag, flag)).toBe(true);
    expect(flagsMatch(`  ${flag.toUpperCase()}\n`, flag)).toBe(true);
  });

  it("refuses another learner's flag, a prefix, and nothing", () => {
    expect(flagsMatch(personalFlag(SECRET, CHALLENGE, BOB), flag)).toBe(false);
    expect(flagsMatch(flag.slice(0, -1), flag)).toBe(false);
    expect(flagsMatch("", flag)).toBe(false);
  });
});
