import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * The public navbar is the only way to sign in from the landing, the
 * catalogue, the glossary and /download. It hid "Connexion" under 480px, so a
 * learner whose session had expired, on a phone, had no way to sign in short of
 * "Commencer" and the small link at the end of the sign-up form.
 */

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => React.createElement("img", { src, alt }),
}));

const { PublicNavbar } = await import("../public-navbar");

// Without its comments, which hold braces and selectors of their own.
const STYLES = readFileSync(path.resolve(__dirname, "../../globals.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//gu,
  "",
);

/**
 * The declarations of every rule of the stylesheet, media queries included,
 * whose selector list names `selector`. An at-rule's own block holds braces, so
 * only the rules inside it match.
 */
function declarationsOf(selector: string): string[] {
  const rules = [...STYLES.matchAll(/([^{}]+)\{([^{}]*)\}/gu)];
  return rules
    .filter((rule) => (rule[1] ?? "").split(",").some((s) => s.trim() === selector))
    .map((rule) => rule[2] ?? "");
}

describe("PublicNavbar", () => {
  it("links to the sign-in page", () => {
    const html = renderToStaticMarkup(<PublicNavbar />);
    expect(html).toMatch(/<a[^>]*href="\/login"[^>]*>Connexion<\/a>/u);
    expect(html).toMatch(/<a[^>]*href="\/register"/u);
  });

  it("never hides 'Connexion', at any width", () => {
    const rules = declarationsOf(".landing-nav-signin");
    expect(rules.length).toBeGreaterThan(0);
    for (const declarations of rules) expect(declarations).not.toMatch(/display:\s*none/u);
  });

  it("lets the app link and the brand's name give way on a phone instead", () => {
    expect(declarationsOf(".landing-nav-download").join(" ")).toMatch(/display:\s*none/u);
    expect(declarationsOf(".landing-nav-wordmark").join(" ")).toMatch(/display:\s*none/u);
    expect(renderToStaticMarkup(<PublicNavbar />)).toContain("landing-nav-wordmark");
  });

  it("keeps the app link a finger's height", () => {
    expect(declarationsOf(".landing-nav-download").join(" ")).toMatch(/min-height:\s*44px/u);
  });
});
