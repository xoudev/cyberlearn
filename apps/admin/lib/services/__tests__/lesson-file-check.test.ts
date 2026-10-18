import { describe, expect, it } from "vitest";
import { checkLessonFile } from "../lesson-file-check";

/**
 * What a lesson file must pass, imported, synchronised or checked in content/
 * by content-check.mjs: each problem of its body at its line in the file, the
 * frontmatter counted, so the author finds it in the file they hold.
 */

const FRONTMATTER = `---
refCode: CL-LSN-001-V01
slug: lecon-test
title: Une lecon de test
description: Une description suffisamment longue pour le schema de validation.
category: DEV
difficulty: BEGINNER
estimatedMinutes: 10
xpReward: 50
---
`;

describe("checkLessonFile", () => {
  it("accepts a file whose body renders and keeps the rules", async () => {
    const result = await checkLessonFile(`${FRONTMATTER}\n## Une section\n\nDu texte.\n`);
    expect(result.ok).toBe(true);
  });

  it("lists every problem of the body at its line in the file", async () => {
    // Line 12 is the heading: ten lines of frontmatter, then a blank one.
    const result = await checkLessonFile(
      `${FRONTMATTER}\n## Une section\n\n<Quiz correct={True} />\n\nUn mot \u2014 un autre.\n`,
    );
    if (result.ok) throw new Error("accepted a broken body");
    expect(result.errors.map(({ field, line }) => ({ field, line }))).toEqual([
      { field: "contentMdx", line: 14 },
      { field: "contentMdx", line: 16 },
    ]);
    expect(result.errors[0]?.message).toMatch(
      /^La section « Une section », ligne 14, colonne 16, ne s'afficherait pas : <Quiz>/,
    );
    expect(result.errors[1]?.message).toMatch(
      /^La section « Une section », ligne 16, colonne 8 : Tiret cadratin/,
    );
  });

  it("counts the problems past those it lists", async () => {
    const result = await checkLessonFile(`${FRONTMATTER}\n## S\n\n${"a \u2014 ".repeat(60)}\n`);
    if (result.ok) throw new Error("accepted em dashes");
    expect(result.errors).toHaveLength(51);
    expect(result.errors.at(-1)?.message).toBe("Il y a encore 10 autres problèmes.");
  });

  it("refuses an em dash in the frontmatter, as CI does, at its line in the file", async () => {
    // U+2014, built rather than written: the typography check reads this file.
    const emDash = String.fromCharCode(0x2014);
    const file = FRONTMATTER.replace("Une lecon de test", `Une lecon ${emDash} de test`);
    const alone = await checkLessonFile(`${file}\n## S\n\nDu texte.\n`);
    if (alone.ok) throw new Error("accepted an em dash in the title");
    expect(alone.errors.map(({ field, line }) => ({ field, line }))).toEqual([
      { field: "title", line: 4 },
    ]);
    expect(alone.errors[0]?.message).toMatch(/^Frontmatter, ligne 4, colonne 18 : Tiret cadratin/);

    // With the body's own problems, the frontmatter's come first, as in the file.
    const both = await checkLessonFile(`${file}\n## S\n\nUn mot ${emDash} un autre.\n`);
    if (both.ok) throw new Error("accepted em dashes");
    expect(both.errors.map(({ field, line }) => ({ field, line }))).toEqual([
      { field: "title", line: 4 },
      { field: "contentMdx", line: 14 },
    ]);
  });

  it("places a YAML error in the file, and says the same the second time", async () => {
    // An unclosed quote on line 4: js-yaml runs to the end of the
    // frontmatter, the closing "---" on line 10.
    const broken = `${FRONTMATTER.replace("title: Une lecon de test", 'title: "Une lecon')}\n## S\n`;
    const first = await checkLessonFile(broken);
    if (first.ok) throw new Error("accepted a broken frontmatter");
    expect(first.errors).toEqual([
      {
        line: 10,
        column: 1,
        message: expect.stringMatching(
          /^Frontmatter, ligne 10, colonne 1 : YAML illisible \(/,
        ) as unknown,
      },
    ]);
    // gray-matter cached the file before parsing it, and handed back an
    // empty frontmatter the second time: other errors for the same file.
    expect(await checkLessonFile(broken)).toEqual(first);
  });

  it("places a frontmatter field the schema refuses at the line of its key", async () => {
    const result = await checkLessonFile(
      `${FRONTMATTER.replace("xpReward: 50", "xpReward: -5")}\n## S\n\nDu texte.\n`,
    );
    if (result.ok) throw new Error("accepted a negative XP");
    expect(result.errors).toEqual([
      {
        field: "xpReward",
        line: 9,
        message: expect.stringMatching(/^Frontmatter, ligne 9 \(xpReward\) : /) as unknown,
      },
    ]);
  });

  it("names a missing field without a line, there being none", async () => {
    const result = await checkLessonFile(
      `${FRONTMATTER.replace("xpReward: 50\n", "")}\n## S\n\nDu texte.\n`,
    );
    if (result.ok) throw new Error("accepted a lesson without XP");
    expect(result.errors.map(({ field, line }) => ({ field, line }))).toEqual([
      { field: "xpReward", line: undefined },
    ]);
  });

  it("places an injection in the file, past code blocks that keep their lines", async () => {
    // The fenced block holds a handler the check must not see, and spans
    // three lines that must still count: the script is on line 18, after
    // inline code blanked to its own width.
    const body = [
      "## S",
      "",
      "```js",
      "button.onClick = run;",
      "```",
      "",
      "Texte avec `onClick=` cité, puis <script>alert(1)</script>",
    ].join("\n");
    const result = await checkLessonFile(`${FRONTMATTER}\n${body}\n`);
    if (result.ok) throw new Error("accepted a script");
    expect(result.errors).toEqual([
      {
        field: "contentMdx",
        line: 18,
        column: 34,
        message: expect.stringMatching(
          /^Ligne 18, colonne 34 : contenu rejeté, injection potentielle détectée/,
        ) as unknown,
      },
    ]);
  });

  it("refuses the frontmatter before reading the body", async () => {
    const result = await checkLessonFile(
      `${FRONTMATTER.replace("CL-LSN-001-V01", "LSN-1")}\n## S\n\nUn mot \u2014 un autre.\n`,
    );
    if (result.ok) throw new Error("accepted a bad refCode");
    expect(result.errors.map((error) => error.field)).toEqual(["refCode"]);
  });
});
