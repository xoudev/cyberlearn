import { describe, expect, it } from "vitest";
import {
  CHANGELOG,
  CHANGELOG_SEEN_KEY,
  CHANGE_META,
  LATEST_VERSION,
  hasUnseenChangelog,
} from "../changelog";

describe("the release notes in the app", () => {
  it("reads the site's list, newest first", () => {
    expect(CHANGELOG[0]?.version).toBe(LATEST_VERSION);
    expect(CHANGELOG.length).toBeGreaterThan(1);
  });

  it("marks the newest release until it has been opened on this device", () => {
    expect(hasUnseenChangelog(null)).toBe(true);
    expect(hasUnseenChangelog(LATEST_VERSION)).toBe(false);
  });

  it("keeps the site's storage key and labels", () => {
    expect(CHANGELOG_SEEN_KEY).toBe("cl-changelog-seen");
    expect(CHANGE_META.new.label).toBe("Nouveau");
    expect(CHANGE_META.fixed.label).toBe("Correctif");
  });
});
