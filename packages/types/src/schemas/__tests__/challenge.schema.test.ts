import { describe, expect, it } from "vitest";
import { parseChallengeTests } from "../challenge.schema.js";

/**
 * The tests of a Python challenge, read from whatever an author wrote.
 *
 * The worker compares `str(result)` with `expected` using ===, so the only
 * question each case asks is: does this become exactly what Python prints?
 */

describe("what passes through unchanged", () => {
  it("keeps a string, which is what the worker compares against", () => {
    const r = parseChallengeTests([{ input: "f()", expected: "3" }]);
    expect(r).toEqual({ ok: true, tests: [{ input: "f()", expected: "3" }] });
  });

  it("keeps a dictionary written the way the component asks, as Python prints it", () => {
    const r = parseChallengeTests([
      { input: "f()", expected: "{'titre': 'Acheter du pain', 'fait': False}" },
    ]);
    expect(r.ok && r.tests[0]?.expected).toBe("{'titre': 'Acheter du pain', 'fait': False}");
  });

  it("keeps a label", () => {
    const r = parseChallengeTests([{ input: "f()", expected: "3", label: "Cas simple" }]);
    expect(r.ok && r.tests[0]?.label).toBe("Cas simple");
  });
});

describe("what an author meant, spelled the way Python spells it", () => {
  it("turns a number into its text", () => {
    const r = parseChallengeTests([{ input: "f()", expected: 1 }]);
    expect(r.ok && r.tests[0]?.expected).toBe("1");
  });

  it("turns true into True, which is what str() prints", () => {
    // `true` in JavaScript is `True` in Python. Left as "true" it would build
    // a test that can never pass - and the student would be the one who fails.
    const r = parseChallengeTests([{ input: "f()", expected: true }]);
    expect(r.ok && r.tests[0]?.expected).toBe("True");
  });

  it("turns false into False", () => {
    const r = parseChallengeTests([{ input: "f()", expected: false }]);
    expect(r.ok && r.tests[0]?.expected).toBe("False");
  });

  it("turns null into None", () => {
    const r = parseChallengeTests([{ input: "f()", expected: null }]);
    expect(r.ok && r.tests[0]?.expected).toBe("None");
  });
});

describe("what it refuses, and says so", () => {
  it("refuses a dictionary written as an object - the Sentry case", () => {
    // JAVASCRIPT-NEXTJS-15: React was handed {titre, fait} to render as text
    // and the lesson page fell over for everyone.
    const r = parseChallengeTests([
      { input: "f()", expected: { titre: "Acheter du pain", fait: false } },
    ]);
    expect(r.ok).toBe(false);
  });

  it("tells the author what to write instead, naming the test", () => {
    const r = parseChallengeTests([
      { input: "f()", expected: "1" },
      { input: "g()", expected: { titre: "x", fait: false } },
    ]);
    if (r.ok) throw new Error("accepted an object");
    expect(r.problem).toContain("Test 2");
    expect(r.problem).toContain("expected");
    expect(r.problem).toContain(`"{'titre': 'Acheter du pain', 'fait': False}"`);
  });

  it("refuses an array in place of a value", () => {
    expect(parseChallengeTests([{ input: "f()", expected: [1, 2] }]).ok).toBe(false);
  });

  it("refuses a test with no expected", () => {
    const r = parseChallengeTests([{ input: "f()" }]);
    expect(r.ok).toBe(false);
  });

  it("refuses no tests at all", () => {
    // A challenge with nothing to check passes the moment it is opened.
    for (const raw of [[], undefined, null, "tests"]) {
      const r = parseChallengeTests(raw);
      if (r.ok) throw new Error(`accepted ${JSON.stringify(raw)}`);
      expect(r.problem).toContain("aucun test");
    }
  });

  it("refuses a number that is not one", () => {
    expect(parseChallengeTests([{ input: "f()", expected: Number.NaN }]).ok).toBe(false);
  });
});
