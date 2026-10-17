import { describe, expect, it } from "vitest";
import { CHALLENGES_TABS, challengesTabHref, DEFAULT_CHALLENGES_TAB } from "./tabs";

describe("challengesTabHref", () => {
  it("leaves the catalogue at the bare section, and names the tournaments", () => {
    expect(challengesTabHref("defis")).toBe("/challenges");
    expect(challengesTabHref("tournois")).toBe("/challenges?tab=tournois");
  });

  it("opens on the catalogue, one of the tabs", () => {
    expect(CHALLENGES_TABS).toContain(DEFAULT_CHALLENGES_TAB);
    expect(DEFAULT_CHALLENGES_TAB).toBe("defis");
  });
});
