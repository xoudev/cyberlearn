import { describe, expect, it } from "vitest";
import { flawLines, parseFindTheFlaw } from "../find-the-flaw.schema.js";

const CODE = `
query = "SELECT * FROM users WHERE name = '" + name + "'"
cursor.execute(query)
`;

const BASE = {
  id: "sqli-1",
  code: CODE,
  line: 1,
  options: ["Injection SQL", "XSS", "CSRF"],
  correct: 0,
  explanation: "La requête est construite en collant l'entrée de l'utilisateur.",
};

describe("flawLines", () => {
  it("drops the line breaks around a template written on its own lines", () => {
    expect(flawLines(CODE)).toEqual([
      `query = "SELECT * FROM users WHERE name = '" + name + "'"`,
      "cursor.execute(query)",
    ]);
  });

  it("keeps the blank lines and the indentation inside the code", () => {
    expect(flawLines("def f():\n\n    return 1")).toEqual(["def f():", "", "    return 1"]);
  });
});

describe("parseFindTheFlaw", () => {
  it("accepts a well-formed exercise, language defaulting to code", () => {
    const r = parseFindTheFlaw(BASE);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.flaw.language).toBe("code");
  });

  it("refuses a line past the end of the code, and says how many there are", () => {
    expect(parseFindTheFlaw({ ...BASE, line: 3 })).toEqual({
      ok: false,
      problem: "line vaut 3, mais le code n'a que 2 lignes.",
    });
  });

  it("refuses a blank line", () => {
    const r = parseFindTheFlaw({ ...BASE, code: "a = 1\n\nb = 2", line: 2 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problem).toContain("vide");
  });

  it("refuses an answer that is not one of the options", () => {
    const r = parseFindTheFlaw({ ...BASE, correct: 3 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problem).toContain("correct");
  });

  it.each([
    ["no explanation", { explanation: undefined }],
    ["a single option", { options: ["Injection SQL"] }],
    ["a line counted from 0", { line: 0 }],
    ["a line written as text", { line: "1" }],
  ])("refuses %s", (_label, change) => {
    expect(parseFindTheFlaw({ ...BASE, ...change }).ok).toBe(false);
  });
});
