import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";
import { AvatarView } from "../avatar-view";

/**
 * What actually reaches the page.
 *
 * The helpers have their own suite; this one renders the component, because
 * the defect was never in a helper. It was a component putting a value into an
 * `<img src>` without asking what the value was.
 */

function render(props: Parameters<typeof AvatarView>[0]): string {
  return renderToStaticMarkup(React.createElement(AvatarView, props));
}

describe("a picture", () => {
  it("renders a signed URL as an image", () => {
    const html = render({ src: "https://x.supabase.co/sign/a?token=b", name: "Amélie" });
    expect(html).toContain("<img");
    expect(html).toContain("https://x.supabase.co/sign/a?token=b");
  });

  it("names whose it is, for somebody reading with a screen reader", () => {
    const html = render({ src: "/avatars/hacker.png", name: "Amélie" });
    expect(html).toContain('alt="Avatar de Amélie"');
  });

  it("wears the surface's own class, so it keeps that surface's shape", () => {
    // The forum's raw <img> carried no class and rendered as a bare square in
    // a column of circles.
    const html = render({ src: "/avatars/hacker.png", name: "A", className: "fo-post-monogram" });
    expect(html).toContain('class="fo-post-monogram"');
  });
});

describe("a glyph", () => {
  it("draws it rather than writing its marker out", () => {
    const html = render({ src: "__glyph:skull", name: "Amélie" });
    expect(html).toContain("<svg");
    expect(html).toContain("<path");
  });

  it("never puts the marker in an img src", () => {
    // The reported defect. `__glyph:skull` as a src is a broken image, and
    // `__upload:<key>` as a src is a broken image for everybody who uploaded.
    const html = render({ src: "__glyph:skull", name: "Amélie" });
    expect(html).not.toContain("<img");
    expect(html).not.toContain("__glyph:");
  });

  it("falls back to a circle for a glyph nothing draws", () => {
    const html = render({ src: "__glyph:unicorn", name: "Amélie" });
    expect(html).toContain("<circle");
    expect(html).not.toContain("<path");
  });
});

describe("an upload nobody resolved", () => {
  it("shows initials rather than requesting the marker as a path", () => {
    // Found by rendering, not by reasoning: the component was letting this
    // through to <img src="__upload:abc/def.png">, which the browser asks the
    // site for and the site answers with a 404. A caller is meant to resolve
    // it first - and a caller forgetting is the whole reason this PR exists.
    const html = render({ src: "__upload:abc/def.png", name: "Théo Roy" });
    expect(html).not.toContain("<img");
    expect(html).not.toContain("__upload:");
    expect(html).toContain("TR");
  });
});

describe("neither", () => {
  it("writes initials when there is no picture", () => {
    const html = render({ src: null, name: "Amélie Durand" });
    expect(html).toContain("AD");
    expect(html).not.toContain("<img");
  });

  it("writes initials for an empty value too", () => {
    expect(render({ src: "", name: "Sacha" })).toContain("SA");
  });
});
