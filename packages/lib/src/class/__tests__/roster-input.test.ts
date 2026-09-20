import { describe, expect, it } from "vitest";
import { parseRosterInput, ROSTER_INPUT_LIMIT } from "../roster-input";

/**
 * The routing, which is the whole of this module.
 *
 * The case that matters most is the one in the middle: a token that is neither
 * an address nor a handle has to come back as an error. Before this existed it
 * came back as an invitation, and an invitation to `bonjour` sits in the class
 * for thirty days waiting for somebody to sign up with an address that cannot
 * be written.
 */

describe("addresses", () => {
  it("takes an address as an address", () => {
    expect(parseRosterInput("eleve@ecole.fr")).toEqual({
      emails: ["eleve@ecole.fr"],
      handles: [],
      invalid: [],
    });
  });

  it("lower-cases, because that is how they are stored and compared", () => {
    expect(parseRosterInput("Eleve@Ecole.FR").emails).toEqual(["eleve@ecole.fr"]);
  });

  it("splits on newlines, commas, semicolons and spaces alike", () => {
    // A roster arrives pasted out of whatever the school uses.
    const input = "a@x.fr\nb@x.fr, c@x.fr; d@x.fr e@x.fr";
    expect(parseRosterInput(input).emails).toHaveLength(5);
  });

  it("keeps one of each", () => {
    expect(parseRosterInput("a@x.fr\na@x.fr\nA@X.FR").emails).toEqual(["a@x.fr"]);
  });
});

describe("handles", () => {
  it("takes @handle as a handle, and drops the @", () => {
    expect(parseRosterInput("@amelie")).toEqual({
      emails: [],
      handles: ["amelie"],
      invalid: [],
    });
  });

  it("accepts the hyphens and digits a username may contain", () => {
    expect(parseRosterInput("@amelie-d2").handles).toEqual(["amelie-d2"]);
  });

  it("refuses what could not be a username, rather than looking it up", () => {
    // Leading hyphen, a dot, an uppercase-only rule, two characters: all
    // rejected by the product's own username schema, so all rejected here.
    const { handles, invalid } = parseRosterInput("@-nope @a.b @xy");
    expect(handles).toEqual([]);
    expect(invalid).toEqual(["@-nope", "@a.b", "@xy"]);
  });

  it("keeps the @ on the way back, so the message quotes what was typed", () => {
    expect(parseRosterInput("@a.b").invalid).toEqual(["@a.b"]);
  });
});

describe("neither", () => {
  it("refuses a bare word instead of inviting it", () => {
    // The defect this module exists for: `bonjour` used to become a pending
    // invitation addressed to `bonjour`.
    expect(parseRosterInput("bonjour")).toEqual({
      emails: [],
      handles: [],
      invalid: ["bonjour"],
    });
  });

  it("refuses an address with no domain dot", () => {
    expect(parseRosterInput("eleve@ecole").invalid).toEqual(["eleve@ecole"]);
  });

  it("refuses an address with no local part or no domain", () => {
    expect(parseRosterInput("@ eleve@ x@.fr").emails).toEqual([]);
  });

  it("does not silently read a bare word as a handle", () => {
    // Guessing would mean telling somebody who mistyped an address that no
    // account is named after their typo.
    expect(parseRosterInput("amelie").handles).toEqual([]);
    expect(parseRosterInput("amelie").invalid).toEqual(["amelie"]);
  });
});

describe("the three kinds together", () => {
  it("sorts a mixed paste without losing any of it", () => {
    const { emails, handles, invalid } = parseRosterInput(
      "eleve@ecole.fr\n@amelie\nbonjour\nautre@ecole.fr\n@marc",
    );
    expect(emails).toEqual(["eleve@ecole.fr", "autre@ecole.fr"]);
    expect(handles).toEqual(["amelie", "marc"]);
    expect(invalid).toEqual(["bonjour"]);
  });

  it("caps the whole paste, not each kind separately", () => {
    // The limit is there to bound one request, so it counts tokens.
    const raw = Array.from({ length: ROSTER_INPUT_LIMIT + 50 }, (_, i) => `e${String(i)}@x.fr`);
    expect(parseRosterInput(raw.join("\n")).emails).toHaveLength(ROSTER_INPUT_LIMIT);
  });

  it("gives nothing back for nothing typed", () => {
    expect(parseRosterInput("   \n\n  ")).toEqual({ emails: [], handles: [], invalid: [] });
  });
});
