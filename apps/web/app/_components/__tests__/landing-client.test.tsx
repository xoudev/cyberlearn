import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { HomePath } from "../landing-client";

/**
 * The landing page shows the catalogue's own figures or none: a failed read
 * must leave gaps, never numbers written for the occasion. Its in-page links
 * must also land on something.
 */

vi.mock("@/components/brand-typeface", () => ({ brandTypeface: "test-brand-fonts" }));

const { LandingClient } = await import("../landing-client");

const PATH: HomePath = {
  slug: "reseaux-fondamentaux",
  title: "Réseaux, les fondamentaux",
  description: "Le modèle OSI et TCP/IP.",
  category: "NETWORK",
  difficulty: "BEGINNER",
  lessons: 12,
  xp: 1840,
  refCode: "CL-PATH-002-V01",
  hasCertificate: true,
  coverSrc: "/covers/paths/reseaux.svg",
};

function render(props: Partial<React.ComponentProps<typeof LandingClient>> = {}): string {
  return renderToStaticMarkup(
    <LandingClient stats={null} featuredPaths={[]} domainCounts={null} {...props} />,
  );
}

describe("LandingClient", () => {
  it("shows no catalogue figure when the catalogue could not be read", () => {
    const html = render();
    expect(html).not.toContain("leçons au catalogue");
    expect(html).not.toMatch(/\d+ parcours/u);
    expect(html).toContain("Les parcours sont en cours de préparation");
  });

  it("shows the figures it was given, and only for the domains that have paths", () => {
    const html = render({
      stats: { domains: 3, publishedLessons: 352, publishedPaths: 19 },
      featuredPaths: [PATH],
      domainCounts: { CYBERSEC: 9, DEV: 0, NETWORK: 4 },
    });
    expect(html).toContain("<dd>352</dd>");
    expect(html).toContain("<dd>19</dd>");
    expect(html).toContain("9 parcours");
    expect(html).toContain("4 parcours");
    expect(html).not.toContain("0 parcours");
    expect(html).toContain('href="/catalogue#reseaux-fondamentaux"');
    expect(html).toContain("12 leçons");
    expect(html).toContain("Certifiant");
  });

  it("points every in-page link at an element of the page", () => {
    const html = render();
    const anchors = [...html.matchAll(/href="#([^"]+)"/gu)].map((match) => match[1]);
    expect(anchors.length).toBeGreaterThan(0);
    for (const anchor of anchors) expect(html).toContain(`id="${String(anchor)}"`);
  });

  it("keeps one main heading and the way to sign up", () => {
    const html = render();
    expect(html.match(/<h1/gu)).toHaveLength(1);
    expect(html).toMatch(/<a[^>]*href="\/register"/u);
    expect(html).toMatch(/<a[^>]*href="\/verify"/u);
  });
});
