import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ConsoleRatingRow } from "@cyberlearn/db";

vi.mock("next/link", () => ({
  default: (props: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href: props.href }, props.children),
}));

const { RatingsCard, ratingSummary, ratingsShownText } = await import("../ratings-card");

/**
 * The ratings card under a lesson or a path lists the latest only: it says
 * so when there are more, and leads to every one where a page holds them.
 */

function rating(id: string): ConsoleRatingRow {
  return {
    id,
    score: 4,
    feedback: "Clair",
    updatedAt: new Date("2026-10-17T09:00:00Z"),
    userId: null,
    user: null,
  };
}

describe("ratingSummary and ratingsShownText", () => {
  it("sums up the average over every rating, and nothing before the first", () => {
    expect(ratingSummary(4.25, 12)).toBe("4,3 / 5 sur 12 avis");
    expect(ratingSummary(null, 0)).toBeNull();
  });

  it("says how many of how many it shows, only when it does not show them all", () => {
    expect(ratingsShownText(10, 64)).toBe("Les 10 plus récents sur 64.");
    expect(ratingsShownText(1, 3)).toBe("Le plus récent sur 3.");
    expect(ratingsShownText(5, 5)).toBeNull();
  });
});

describe("RatingsCard", () => {
  it("links to every rating when it shows only the latest", () => {
    const html = renderToStaticMarkup(
      React.createElement(RatingsCard, {
        ratings: [rating("a"), rating("b")],
        subject: "cette leçon",
        avg: 4,
        count: 30,
        allHref: "/lessons/l1/ratings",
      }),
    );
    expect(html).toContain("Les 2 plus récents sur 30.");
    expect(html).toContain('href="/lessons/l1/ratings"');
  });

  it("says nothing more when it shows them all, and has no link without a page", () => {
    const all = renderToStaticMarkup(
      React.createElement(RatingsCard, {
        ratings: [rating("a")],
        subject: "ce parcours",
        avg: 4,
        count: 1,
      }),
    );
    expect(all).not.toContain("plus récent");
    const partial = renderToStaticMarkup(
      React.createElement(RatingsCard, {
        ratings: [rating("a")],
        subject: "ce parcours",
        avg: 4,
        count: 80,
      }),
    );
    expect(partial).toContain("Le plus récent sur 80.");
    expect(partial).not.toContain("<a ");
  });
});
