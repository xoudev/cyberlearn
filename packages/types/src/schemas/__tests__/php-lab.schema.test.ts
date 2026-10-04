import { describe, expect, it } from "vitest";
import { parsePhpLab, phpLabFiles } from "../php-lab.schema.js";

const LAB = {
  id: "p",
  task: "Trouve la faille.",
  file: "search.php",
  code: "<?php echo $_GET['q'];",
};

describe("parsePhpLab", () => {
  it("accepts a lab with only a page to read, index.php unless said", () => {
    expect(parsePhpLab({ id: "p", task: "x", code: "<?php echo 1;" })).toMatchObject({
      ok: true,
      value: { file: "index.php" },
    });
    expect(parsePhpLab(LAB).ok).toBe(true);
  });

  it("reads requests, and the two kinds of check, with what they need", () => {
    const parsed = parsePhpLab({
      ...LAB,
      support: { "data.php": "<?php return [];" },
      requests: [{ label: "Normale", url: "/search.php?q=php", cookie: "session=tok-bob" }],
      checks: [
        { kind: "seen", label: "Exécuté", expect: { executable: true } },
        {
          kind: "seen",
          label: "Lu",
          when: { cookie: "tok-bob" },
          expect: { status: 200, contains: "Alice" },
        },
        {
          kind: "fixed",
          label: "Corrigé",
          request: { url: "/search.php?q=%3Cscript%3E" },
          expect: { executable: false, notContains: "<script>" },
        },
        {
          kind: "fixed",
          label: "Refusé",
          request: { url: "/invoice.php?id=1" },
          expect: { status: [403, 404] },
        },
      ],
      hints: ["Regarde la source."],
    });
    expect(parsed.ok).toBe(true);
    expect(parsed.ok && parsed.value.checks?.[2]).toMatchObject({ request: { method: "GET" } });
  });

  it("refuses an address that is not a path, and one that would leave the lab", () => {
    const check = (url: string): boolean =>
      parsePhpLab({ ...LAB, requests: [{ label: "x", url }] }).ok;
    expect(check("/search.php?q=<script>alert(1)</script>")).toBe(true);
    expect(check("search.php")).toBe(false);
    expect(check("//evil.example/x")).toBe(false);
    expect(check("https://evil.example/x")).toBe(false);
  });

  it("refuses an empty expectation, and a check that is neither seen nor fixed", () => {
    expect(parsePhpLab({ ...LAB, checks: [{ kind: "seen", label: "x", expect: {} }] }).ok).toBe(
      false,
    );
    expect(
      parsePhpLab({ ...LAB, checks: [{ kind: "tried", label: "x", expect: { status: 200 } }] }).ok,
    ).toBe(false);
  });

  it("refuses a page path PHP would not serve from the lab", () => {
    expect(parsePhpLab({ ...LAB, file: "../search.php" }).ok).toBe(false);
    expect(parsePhpLab({ ...LAB, file: "Search.php" }).ok).toBe(false);
    expect(parsePhpLab({ ...LAB, file: "search.txt" }).ok).toBe(false);
    expect(parsePhpLab({ ...LAB, file: "lib/search.php" }).ok).toBe(true);
  });

  it("refuses a code that names the JavaScript bridge, and says in which page", () => {
    expect(parsePhpLab({ ...LAB, code: "<?php vrzno_eval('1');" })).toEqual({
      ok: false,
      problem: "search.php nomme Vrzno : le pont vers JavaScript est fermé dans un labo.",
    });
    const hidden = parsePhpLab({ ...LAB, support: { "x.php": "<?php new Vrzno();" } });
    expect(hidden.ok ? "" : hidden.problem).toContain("x.php nomme Vrzno");
  });

  it("refuses a support page that is the page to change", () => {
    const parsed = parsePhpLab({ ...LAB, support: { "search.php": "<?php echo 1;" } });
    expect(parsed.ok ? "" : parsed.problem).toContain("ne peut pas être aussi une page d'appui");
  });
});

describe("phpLabFiles", () => {
  it("puts the learner's version of the page among the pages it relies on", () => {
    const parsed = parsePhpLab({ ...LAB, support: { "data.php": "<?php return 1;" } });
    if (!parsed.ok) throw new Error(parsed.problem);
    expect(phpLabFiles(parsed.value, "<?php echo 'mine';")).toEqual({
      "data.php": "<?php return 1;",
      "search.php": "<?php echo 'mine';",
    });
    expect(phpLabFiles(parsed.value)["search.php"]).toBe(LAB.code);
  });
});
