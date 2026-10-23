/**
 * A stylesheet read as text, for the tests that pin a rule the browser alone
 * would otherwise show (a width at a breakpoint, a touch target): there is no
 * layout in jsdom, so the contract is the rule itself.
 *
 * It reads plain CSS: blocks, nested at-rules, comments. A brace inside a
 * string or a url() is not handled, and none of the sheets read has one in the
 * rules looked at.
 */

interface Block {
  /** What comes before the brace: a selector list, or an at-rule and its condition. */
  prelude: string;
  /** What is between the braces, nested blocks included. */
  body: string;
}

/** The sheet without its comments, which may quote the rule being looked for. */
function bare(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//gu, "");
}

/** The blocks at the top level of `css`, in order. */
function blocksOf(css: string): Block[] {
  const text = bare(css);
  const blocks: Block[] = [];
  let preludeStart = 0;
  let depth = 0;
  let bodyStart = 0;
  let prelude = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "{") {
      if (depth === 0) {
        prelude = text.slice(preludeStart, i);
        bodyStart = i + 1;
      }
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) {
        blocks.push({
          prelude: prelude.trim().replace(/\s+/gu, " "),
          body: text.slice(bodyStart, i),
        });
        preludeStart = i + 1;
      }
    } else if (c === ";" && depth === 0) {
      // A statement without a block (@import, @charset).
      preludeStart = i + 1;
    }
  }
  return blocks;
}

/**
 * The bodies of the blocks at the top level of `css` that `header` names, in
 * order: an at-rule with its condition (`@media (max-width: 767px)`), or a
 * selector that is the block's own or one of its comma-separated list (`.a`
 * finds `.a, .b { ... }` but not `.c .a { ... }`).
 *
 * A sheet repeats a media query as often as it likes. A rule of one is found
 * by taking the media queries of that condition and keeping the one that has
 * the rule: `cssBlocks(sheet, "@media (...)").find((b) => cssBlock(b, ".a"))`.
 */
export function cssBlocks(css: string, header: string): string[] {
  const wanted = header.trim().replace(/\s+/gu, " ");
  return blocksOf(css)
    .filter(
      (block) =>
        block.prelude === wanted ||
        (!wanted.startsWith("@") && block.prelude.split(",").some((s) => s.trim() === wanted)),
    )
    .map((block) => block.body);
}

/** The first of `cssBlocks`, or undefined when there is none. */
export function cssBlock(css: string, header: string): string | undefined {
  return cssBlocks(css, header)[0];
}

/** The media query of this condition that holds a rule for `selector`, if any. */
export function mediaRule(css: string, condition: string, selector: string): string | undefined {
  for (const media of cssBlocks(css, `@media ${condition}`)) {
    const rule = cssBlock(media, selector);
    if (rule !== undefined) return rule;
  }
  return undefined;
}

/** The value a block gives a property, or undefined (`width: 340px;` gives "340px"). */
export function cssValue(block: string, property: string): string | undefined {
  for (const declaration of block.split(";")) {
    const colon = declaration.indexOf(":");
    if (colon !== -1 && declaration.slice(0, colon).trim() === property) {
      return declaration.slice(colon + 1).trim();
    }
  }
  return undefined;
}
