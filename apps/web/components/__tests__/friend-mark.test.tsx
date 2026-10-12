import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FriendMark, FriendsGlyph } from "../friend-mark";

describe("FriendMark", () => {
  it("reads as the word 'Ami', the drawing kept from the screen reader", () => {
    const html = renderToStaticMarkup(<FriendMark />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Ami"');
    expect(html).toContain('title="Ami"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('class="friend-mark"');
  });

  it("is drawn in the accent, the second head filled", () => {
    const html = renderToStaticMarkup(<FriendMark />);
    expect(html).toContain('stroke="var(--cosmetic-accent)"');
    expect(html).toContain('fill="var(--cosmetic-accent)"');
  });

  it("keeps a surface's own class beside its own", () => {
    expect(renderToStaticMarkup(<FriendMark className="pp-mark" />)).toContain(
      'class="friend-mark pp-mark"',
    );
  });
});

describe("FriendsGlyph", () => {
  it("draws a request outlined and a friendship filled", () => {
    expect(renderToStaticMarkup(<FriendsGlyph />)).not.toContain('fill="currentColor"');
    expect(renderToStaticMarkup(<FriendsGlyph filled />)).toContain('fill="currentColor"');
  });
});
