import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The lesson's typography (globals.css) is for the prose an author writes. MDX
 * puts each paragraph, list or heading, and each component's block, straight
 * under the article, so a rule that starts at `article.lesson-content >` stops
 * at a component's edge. The rules used to match every element of the article
 * with !important, which beat the components' own inline styles: a lab's
 * 14px text came out at 16px with a margin and a 680px measure, its lists grew
 * markers, the quiz question shrank, every <pre> got a second frame.
 */

const sheet = readFileSync(path.resolve(__dirname, "../../../../../globals.css"), "utf8");

/** A selector list split on its own commas, not those inside :is(...). */
function selectorsOf(list: string): string[] {
  const selectors: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "," && depth === 0) {
      selectors.push(list.slice(start, i));
      start = i + 1;
    }
  }
  selectors.push(list.slice(start));
  return selectors.map((s) => s.replace(/\s+/gu, " ").trim());
}

/** The sheet's style rules, innermost first, comments left out. */
function rulesOf(css: string): { selectors: string[]; body: string }[] {
  const bare = css.replace(/\/\*[\s\S]*?\*\//gu, "");
  return Array.from(bare.matchAll(/([^{}]+)\{([^{}]*)\}/gu), (m) => ({
    selectors: selectorsOf(m[1] ?? ""),
    body: m[2] ?? "",
  }));
}

const lessonRules = rulesOf(sheet).filter((rule) =>
  rule.selectors.some((s) => /lesson-content|lesson-callout__body|^\.prose\b/u.test(s)),
);

describe("the lesson's typography", () => {
  it("is found in the sheet", () => {
    expect(lessonRules.length).toBeGreaterThan(20);
  });

  it("starts at the article's own children, or at a Callout's body", () => {
    const anchored =
      /^(?:article\.lesson-content|:is\(article\.lesson-content, \.lesson-callout__body\)|\.lesson-callout__body) > /u;
    const loose = lessonRules
      .flatMap((rule) => rule.selectors)
      .filter((s) => /lesson-content|lesson-callout__body/u.test(s))
      .filter((s) => s !== "article.lesson-content" && !anchored.test(s));
    expect(loose).toEqual([]);
  });

  it("leaves the components' own styles alone: no !important", () => {
    const forced = lessonRules
      .filter((rule) => rule.body.includes("!important"))
      .map((rule) => rule.selectors.join(", "));
    expect(forced).toEqual([]);
  });

  it("does not frame a <pre>: CodeBlock draws fenced code, a component its own", () => {
    const pre = lessonRules.find((rule) => rule.selectors.includes(".prose pre"));
    expect(pre?.body).toMatch(/padding: 0;/u);
    expect(pre?.body).toMatch(/background: none;/u);
    expect(pre?.body).not.toMatch(/border(?:-left)?:/u);
  });
});

/**
 * A component's block (lesson-mdx-components.ts): the container its
 * component lays itself out by, in the prose's measure or wide. Being a
 * container, it stops the component's margins from meeting the prose's, so it
 * takes the spacing over: the component's top and bottom margins, and nothing
 * else of it, are set aside.
 */
const blockRules = rulesOf(sheet).filter((rule) =>
  rule.selectors.some((s) => s.startsWith(".lesson-block")),
);

describe("a component's block", () => {
  it("is a size container, named for the components' container queries", () => {
    const block = blockRules.find((rule) => rule.selectors.includes(".lesson-block"));
    expect(block?.body).toMatch(/container: lesson-block \/ inline-size;/u);
    expect(block?.body).toMatch(/margin-inline: auto;/u);
  });

  it("sits in the prose's measure, or wide up to the article's width in focus mode", () => {
    const prose = blockRules.find((rule) =>
      rule.selectors.includes('.lesson-block[data-width="prose"]'),
    );
    const wide = blockRules.find((rule) =>
      rule.selectors.includes('.lesson-block[data-width="wide"]'),
    );
    expect(prose?.body).toMatch(/max-width: 720px;/u);
    expect(wide?.body).toMatch(/max-width: 1200px;/u);
  });

  it("forces nothing on its component but the top and bottom margins", () => {
    const forced = blockRules
      .filter((rule) => rule.body.includes("!important"))
      .map((rule) => [rule.selectors.join(", "), rule.body.trim()]);
    expect(forced).toEqual([[".lesson-block > *", "margin-block: 0 !important;"]]);
  });
});
