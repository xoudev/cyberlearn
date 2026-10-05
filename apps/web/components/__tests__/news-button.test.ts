import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";
import { NewsButton } from "../news-button";

describe("the news button", () => {
  it("leads to the release notes, named for a screen reader, and starts quiet", () => {
    const html = renderToStaticMarkup(React.createElement(NewsButton));
    expect(html).toContain('href="/changelog"');
    expect(html).toContain('aria-label="Nouveautés"');
    expect(html).toContain("Nouveautés</span>");
    // What this device has read is only known once mounted: no mark on the
    // first paint, so a reader who has seen the notes gets no flash.
    expect(html).not.toContain("news-chip--fresh");
    expect(html).not.toContain("news-chip__dot");
  });
});
