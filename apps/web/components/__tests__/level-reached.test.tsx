import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LevelReached } from "../level-reached";

describe("LevelReached", () => {
  it("says the level once for the ear and once for the eye", () => {
    const html = renderToStaticMarkup(<LevelReached level={7} />);
    expect(html).toContain("Niveau 7 atteint");
    expect(html).toContain('aria-hidden="true">7<');
    expect(html).toContain('class="level-reached"');
  });

  it("has a smaller size for inside the lesson recap", () => {
    const html = renderToStaticMarkup(<LevelReached level={12} size="sm" />);
    expect(html).toContain('class="level-reached level-reached--sm"');
  });
});
