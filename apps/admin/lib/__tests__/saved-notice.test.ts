import { describe, expect, it } from "vitest";
import { SAVED_PARAM, savedNoticeText, withoutSavedNotice, withSavedNotice } from "../saved-notice";

/**
 * The flag a save leaves on the page it redirects to, read and removed by the
 * console's layout.
 */

describe("withSavedNotice", () => {
  it("adds the flag to an address without a query", () => {
    expect(withSavedNotice("/badges")).toBe(`/badges?${SAVED_PARAM}=1`);
    expect(withSavedNotice("/tournaments", "deleted")).toBe("/tournaments?saved=deleted");
  });

  it("keeps the query an address already has", () => {
    expect(withSavedNotice("/lessons?sort=-xp&page=2", "created")).toBe(
      "/lessons?sort=-xp&page=2&saved=created",
    );
  });
});

describe("savedNoticeText", () => {
  it("words each flag", () => {
    expect(savedNoticeText("1")).toBe("Enregistré.");
    expect(savedNoticeText("created")).toBe("Créé.");
    expect(savedNoticeText("deleted")).toBe("Supprimé.");
  });

  it("says nothing for no flag, or one it did not write", () => {
    expect(savedNoticeText(null)).toBeNull();
    expect(savedNoticeText("")).toBeNull();
    expect(savedNoticeText("<script>")).toBeNull();
    // Not fooled by what every object has.
    expect(savedNoticeText("toString")).toBeNull();
  });
});

describe("withoutSavedNotice", () => {
  it("takes the flag off and keeps the rest of the query", () => {
    expect(withoutSavedNotice("/lessons", "sort=-xp&saved=1&page=2")).toBe(
      "/lessons?sort=-xp&page=2",
    );
  });

  it("leaves the bare path when the flag was all there was", () => {
    expect(withoutSavedNotice("/badges", "?saved=created")).toBe("/badges");
    expect(withoutSavedNotice("/badges", "")).toBe("/badges");
  });
});
