import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Callout } from "../callout";

/**
 * A Callout's left edge is a 3px stripe in its accent, the rest of its frame
 * 1px. Both are inline declarations on its root, and in one declaration block
 * the last one wins: a `border` shorthand written after `borderLeft` took the
 * stripe back to 1px. The order of two keys is the whole fix, so a test holds
 * it.
 *
 * Read from the server's markup, which is what the browser parses (Callout is
 * a Server Component). Not from jsdom: it drops a `border` whose colour is a
 * color-mix(), so the shorthand never shows up there to undo anything.
 */

const EDGES = ["top", "right", "bottom", "left"] as const;
type Edge = (typeof EDGES)[number];

/** Each edge's width once the root's inline declarations apply, in order. */
function borderWidths(markup: string): Partial<Record<Edge, string>> {
  const style = /^<div style="([^"]*)"/u.exec(markup)?.[1] ?? "";
  const widths: Partial<Record<Edge, string>> = {};
  for (const declaration of style.split(";")) {
    const colon = declaration.indexOf(":");
    const property = declaration.slice(0, colon).trim();
    const width =
      declaration
        .slice(colon + 1)
        .trim()
        .split(" ")[0] ?? "";
    for (const edge of EDGES) {
      if (property === "border" || property === `border-${edge}`) widths[edge] = width;
    }
  }
  return widths;
}

describe("Callout", () => {
  it.each(["info", "tip", "warning", "danger", "note"])(
    "%s keeps its 3px stripe on the left of a 1px frame",
    (type) => {
      expect(borderWidths(renderToStaticMarkup(<Callout type={type}>x</Callout>))).toEqual({
        top: "1px",
        right: "1px",
        bottom: "1px",
        left: "3px",
      });
    },
  );

  it("is what the check reads: the shorthand last puts the stripe back to 1px", () => {
    const markup =
      '<div style="border-left:3px solid var(--color-warning);border:1px solid var(--color-warning)">';
    expect(borderWidths(markup).left).toBe("1px");
  });
});
