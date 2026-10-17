import { describe, expect, it } from "vitest";
import { CHALLENGES_TABS } from "@cyberlearn/lib/challenges/tabs";
import { PROFILE_TABS } from "@cyberlearn/lib/social/profile-tabs";
import { tabFromQuery } from "../tab-query";

describe("tabFromQuery", () => {
  it("reads a tab the page has", () => {
    expect(tabFromQuery("certificats", PROFILE_TABS, "badges")).toBe("certificats");
    expect(tabFromQuery("tournois", CHALLENGES_TABS, "defis")).toBe("tournois");
  });

  it("opens the default tab on a bare address", () => {
    expect(tabFromQuery(undefined, PROFILE_TABS, "badges")).toBe("badges");
    expect(tabFromQuery(null, PROFILE_TABS, "badges")).toBe("badges");
  });

  it("opens the default tab on a value the page does not know", () => {
    expect(tabFromQuery("admin", PROFILE_TABS, "badges")).toBe("badges");
    expect(tabFromQuery("Certificats", PROFILE_TABS, "badges")).toBe("badges");
    expect(tabFromQuery("", CHALLENGES_TABS, "defis")).toBe("defis");
  });

  it("takes the first of a repeated parameter", () => {
    expect(tabFromQuery(["activite", "badges"], PROFILE_TABS, "badges")).toBe("activite");
    expect(tabFromQuery([], PROFILE_TABS, "badges")).toBe("badges");
  });
});
