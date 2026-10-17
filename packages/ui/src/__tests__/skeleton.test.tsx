import React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Skeleton, SkeletonCard, SkeletonText } from "../components/skeleton.js";

/**
 * The one loading placeholder of both apps. The site and the console each had
 * their own, and the console's was rounded where everything else is square.
 */

const css = readFileSync(join(__dirname, "..", "skeleton.css"), "utf8");

describe("Skeleton", () => {
  it("is a square shimmer block, sized in px from numbers and as given from strings", () => {
    const html = renderToStaticMarkup(<Skeleton w={120} h="0.9em" />);
    expect(html).toBe('<div class="cl-skel" style="width:120px;height:0.9em"></div>');
  });

  it("stands in for text as a span, so it fits inside a <p> or a <th>", () => {
    const html = renderToStaticMarkup(
      <p>
        <Skeleton as="span" w={40} h={10} className="a-search" />
      </p>,
    );
    expect(html).toBe(
      '<p><span class="cl-skel a-search" style="width:40px;height:10px"></span></p>',
    );
  });

  it("is round only when asked, for an element that is round itself", () => {
    expect(renderToStaticMarkup(<Skeleton w={8} h={8} radius="circle" />)).toContain(
      "border-radius:50%",
    );
    expect(renderToStaticMarkup(<Skeleton w={8} h={8} />)).not.toContain("border-radius");
  });

  it("passes its other attributes through", () => {
    expect(renderToStaticMarkup(<Skeleton aria-hidden="true" data-x="1" />)).toBe(
      '<div class="cl-skel" aria-hidden="true" data-x="1"></div>',
    );
  });
});

describe("SkeletonText and SkeletonCard", () => {
  it("stacks full lines and a short last one", () => {
    const html = renderToStaticMarkup(<SkeletonText lines={3} lastWidth={50} />);
    expect(html.match(/class="cl-skel"/gu)).toHaveLength(3);
    expect(html.match(/width:100%/gu)).toHaveLength(2);
    expect(html).toContain("width:50px");
  });

  it("draws the cards' surface around its children", () => {
    expect(renderToStaticMarkup(<SkeletonCard className="x">a</SkeletonCard>)).toBe(
      '<div class="cl-skel-card x">a</div>',
    );
  });
});

describe("skeleton.css", () => {
  it("rounds nothing: the apps are square", () => {
    expect(css).not.toMatch(/border-radius/u);
  });

  it("lets a span take a size without outranking the class it is laid on", () => {
    // :where() has no weight, so the console grid's search box keeps its own
    // width limits when its skeleton borrows .a-search.
    expect(css).toMatch(/:where\(span\.cl-skel\) \{[^}]*display: inline-block;/u);
  });

  it("stops the shimmer for those who asked for less motion", () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*\.cl-skel \{[^}]*animation: none;/u,
    );
  });
});
