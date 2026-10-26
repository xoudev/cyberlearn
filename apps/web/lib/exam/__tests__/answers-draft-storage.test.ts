// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearDraft, draftKey, loadDraft, saveDraft } from "@cyberlearn/lib/exam/answers-draft";
import { browserDraftStorage } from "../answers-draft-storage";

/**
 * The browser's localStorage as the place a copy's answers wait for the
 * hand-in, through the rules the app shares (answers-draft.ts).
 */

const NOW = Date.UTC(2026, 9, 22, 10, 0, 0);

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("browserDraftStorage", () => {
  it("keeps the answers across a reload of the page, which only the storage survives", async () => {
    await saveDraft(browserDraftStorage, "exam", "a1", { q1: "b" }, NOW);
    expect(window.localStorage.getItem(draftKey("exam", "a1"))).not.toBeNull();
    expect(await loadDraft(browserDraftStorage, "exam", "a1", NOW)).toEqual({ q1: "b" });
  });

  it("forgets them once the copy is in", async () => {
    await saveDraft(browserDraftStorage, "mock", "a1", { "0": 2 }, NOW);
    await clearDraft(browserDraftStorage, "mock", "a1");
    expect(window.localStorage.length).toBe(0);
  });

  it("lists the keys it holds, to find drafts nobody finished", async () => {
    window.localStorage.setItem("other", "1");
    await saveDraft(browserDraftStorage, "exam", "a1", { q1: "a" }, NOW);
    expect([...(await browserDraftStorage.keys())].sort()).toEqual(
      ["other", draftKey("exam", "a1")].sort(),
    );
  });

  it("lets the exam go on when the browser refuses localStorage", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    await expect(saveDraft(browserDraftStorage, "exam", "a1", { q1: "a" }, NOW)).resolves.toBe(
      undefined,
    );
    expect(await loadDraft(browserDraftStorage, "exam", "a1", NOW)).toEqual({});
  });
});
