import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE_TAB, PROFILE_TABS, profileTabHref } from "./profile-tabs";

describe("profileTabHref", () => {
  it("names every tab in the address, the default one included", () => {
    expect(PROFILE_TABS.map(profileTabHref)).toEqual([
      "/profile?tab=activite",
      "/profile?tab=badges",
      "/profile?tab=certificats",
    ]);
  });

  it("opens on the badges, one of the tabs", () => {
    expect(PROFILE_TABS).toContain(DEFAULT_PROFILE_TAB);
    expect(DEFAULT_PROFILE_TAB).toBe("badges");
  });
});
