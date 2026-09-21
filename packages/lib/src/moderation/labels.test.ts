import { describe, expect, it } from "vitest";
import { concernsAPerson, labelRules, RULE_LABEL } from "./labels.js";
import type { FindingRule } from "./moderate.js";

/**
 * Who a refusal is worth telling, and in what words.
 *
 * The split is the whole of this module and it is a policy, not a detail: the
 * screen refuses everything it flags, and only some of what it flags is a
 * teacher's business.
 */

describe("what reaches a teacher", () => {
  it("passes on the ones that are about a person", () => {
    for (const rule of ["slur", "insult", "threat", "sexual", "self-harm"] as FindingRule[]) {
      expect(concernsAPerson([rule])).toBe(true);
    }
  });

  it("keeps quiet about the ones that are about a text", () => {
    // A student pasting two sources has not done anything an adult needs to
    // hear about, and being told so is how the alerts stop being read.
    for (const rule of ["link-spam", "shouting", "vulgarity"] as FindingRule[]) {
      expect(concernsAPerson([rule])).toBe(false);
    }
  });

  it("counts contact details, which are not an offence", () => {
    // Deliberate, and the one entry that is not about misbehaviour: a
    // fifteen-year-old handing out their phone number is exactly the case an
    // adult should see.
    expect(concernsAPerson(["contact-details"])).toBe(true);
  });

  it("sends the whole refusal once any part of it is about a person", () => {
    expect(concernsAPerson(["link-spam", "insult"])).toBe(true);
  });

  it("says no to nothing at all", () => {
    expect(concernsAPerson([])).toBe(false);
  });
});

describe("the words themselves", () => {
  it("names every rule the screen can return", () => {
    // The Record type refuses a missing key at compile time; this catches an
    // empty string put there to satisfy it.
    for (const label of Object.values(RULE_LABEL)) {
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });

  it("names each rule once, in the order it was found", () => {
    expect(labelRules(["insult", "link-spam", "insult"])).toEqual(["insultes", "liens suspects"]);
  });

  it("gives nothing back for nothing found", () => {
    expect(labelRules([])).toEqual([]);
  });
});
