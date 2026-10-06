import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MODERATION_RECORD_EMPTY } from "@cyberlearn/lib/moderation/record";
import { ModerationSection } from "../ModerationSection";

/** The record reads its dates from the strings the drawer's request carries. */
describe("the moderation section", () => {
  it("says there is nothing when there is nothing", () => {
    const html = renderToStaticMarkup(<ModerationSection data={{ events: [] }} />);
    expect(html).toContain("MODÉRATION");
    // The markup escapes the apostrophe.
    expect(html).toContain(MODERATION_RECORD_EMPTY.replaceAll("'", "&#x27;"));
  });

  it("dates each event, and its review when there was one, in Paris time", () => {
    const html = renderToStaticMarkup(
      <ModerationSection
        data={{
          events: [
            {
              id: "e1",
              surface: "FORUM_ANSWER",
              excerpt: "un extrait signalé",
              outcome: "UPHELD",
              createdAt: "2026-03-04T09:30:00.000Z",
              reviewedAt: "2026-03-05T16:00:00.000Z",
            },
            {
              id: "e2",
              surface: "FORUM_ANSWER",
              excerpt: "un autre extrait",
              outcome: "PENDING",
              createdAt: "2026-03-06T08:00:00.000Z",
              reviewedAt: null,
            },
          ],
        }}
      />,
    );
    expect(html).toContain("un extrait signalé");
    expect(html).toContain("4 mars 2026");
    expect(html).toContain("10:30");
    expect(html).toContain("le 5 mars 2026");
    expect(html.match(/>le /g)?.length).toBe(1);
  });
});
