import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";
import { PathCatalogCard, type PathCatalogCardData, RatingStat } from "../path-catalog-card";

const PATH: PathCatalogCardData = {
  slug: "reseaux-fondamentaux",
  refCode: "NET-101",
  title: "Réseaux : les fondamentaux",
  description: "Adresses, routes et paquets.",
  category: "NETWORK",
  track: "SKILL",
  difficulty: "BEGINNER",
  estimatedHours: 6,
  xpTotal: 1200,
  lessonCount: 8,
  hasCert: true,
};

describe("the rating in a card's stats line", () => {
  it("writes the average the French way, the count in the tooltip", () => {
    const html = renderToStaticMarkup(
      React.createElement(RatingStat, { rating: { avg: 4.6, count: 12 } }),
    );
    expect(html).toContain("<b>4,6</b>");
    expect(html).toContain("4,6 sur 5, 12 avis");
    expect(html).not.toContain("12 avis</span>");
  });

  it("spells the count out when asked, for the hero", () => {
    const html = renderToStaticMarkup(
      React.createElement(RatingStat, { rating: { avg: 5, count: 3 }, withCount: true }),
    );
    expect(html).toContain("<b>5,0</b>");
    expect(html).toContain("· 3 avis");
  });

  it("groups a large count like the path's own page, in the line and the tooltip", () => {
    const html = renderToStaticMarkup(
      React.createElement(RatingStat, { rating: { avg: 4.5, count: 1250 }, withCount: true }),
    );
    expect(html).toContain("· 1 250 avis");
    expect(html).toContain("4,5 sur 5, 1 250 avis");
    expect(html).not.toContain("1250");
  });

  it("draws nothing before anybody has rated", () => {
    expect(
      renderToStaticMarkup(React.createElement(RatingStat, { rating: { avg: 0, count: 0 } })),
    ).toBe("");
  });
});

describe("a path to discover", () => {
  it("shows its rating next to the XP once it has one", () => {
    const html = renderToStaticMarkup(
      React.createElement(PathCatalogCard, { path: { ...PATH, rating: { avg: 4.2, count: 7 } } }),
    );
    expect(html).toContain("<b>4,2</b>");
    expect(html).toContain("rating__star");
  });

  it("shows no star without one", () => {
    const html = renderToStaticMarkup(React.createElement(PathCatalogCard, { path: PATH }));
    expect(html).not.toContain("★");
  });
});

describe("a path's cover on its card", () => {
  it("layers the supplied image under the branded poster", () => {
    const html = renderToStaticMarkup(
      React.createElement(PathCatalogCard, {
        path: { ...PATH, coverSrc: "/covers/paths/reseaux.svg" },
      }),
    );
    expect(html).toContain("game-card__cover game-card__cover--poster");
    expect(html).toContain("background-image:url(&quot;/covers/paths/reseaux.svg&quot;)");
    expect(html).toContain('class="catalogue-artwork__cover"');
    expect(html).toContain('class="catalogue-artwork__brand"');
  });

  it("keeps the brand, domain and reference without an image", () => {
    const html = renderToStaticMarkup(React.createElement(PathCatalogCard, { path: PATH }));
    expect(html).not.toContain('class="catalogue-artwork__cover"');
    expect(html).toContain('class="catalogue-artwork__brand"');
    expect(html).toContain('data-category="NETWORK"');
    expect(html).toContain("NET-101");
  });
});
