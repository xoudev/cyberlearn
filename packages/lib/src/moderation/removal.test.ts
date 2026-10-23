import { describe, expect, it } from "vitest";
import {
  REMOVAL_NOTICE,
  REMOVAL_TAG,
  isRemovalKind,
  removalKindOf,
  type RemovalKind,
} from "./removal";

describe("removalKindOf", () => {
  it("has nothing to say about a message that is up", () => {
    expect(
      removalKindOf({ isHidden: false, hiddenByModeration: false, awaitingReview: false }),
    ).toBeNull();
  });

  it("calls a message its author took down withdrawn", () => {
    expect(
      removalKindOf({ isHidden: true, hiddenByModeration: false, awaitingReview: false }),
    ).toBe("WITHDRAWN");
  });

  it("calls a message the screen held, still in the queue, held: not removed at all", () => {
    expect(removalKindOf({ isHidden: true, hiddenByModeration: false, awaitingReview: true })).toBe(
      "HELD",
    );
  });

  it("calls a message a moderator hid moderated, whatever the queue says", () => {
    expect(removalKindOf({ isHidden: true, hiddenByModeration: true, awaitingReview: false })).toBe(
      "MODERATED",
    );
    expect(removalKindOf({ isHidden: true, hiddenByModeration: true, awaitingReview: true })).toBe(
      "MODERATED",
    );
  });

  it("does not call a message that is up anything, even with a stale queue entry", () => {
    expect(
      removalKindOf({ isHidden: false, hiddenByModeration: false, awaitingReview: true }),
    ).toBeNull();
  });
});

describe("the words", () => {
  const kinds: RemovalKind[] = ["WITHDRAWN", "HELD", "MODERATED"];

  it("name each case differently on the site and in the app", () => {
    expect(new Set(kinds.map((kind) => REMOVAL_TAG[kind])).size).toBe(3);
    expect(new Set(kinds.map((kind) => REMOVAL_NOTICE[kind])).size).toBe(3);
  });

  it("keeps the app's line a statement the author alone can read", () => {
    for (const kind of kinds) expect(REMOVAL_NOTICE[kind]).toMatch(/toi seul le vois$/u);
  });

  it("says a held message is waiting, not removed", () => {
    expect(REMOVAL_TAG.HELD).toBe("en attente de validation");
    expect(REMOVAL_NOTICE.HELD).not.toMatch(/retiré/iu);
  });
});

describe("isRemovalKind", () => {
  it("accepts the three and nothing else", () => {
    expect(isRemovalKind("HELD")).toBe(true);
    expect(isRemovalKind("held")).toBe(false);
    expect(isRemovalKind(null)).toBe(false);
    expect(isRemovalKind(undefined)).toBe(false);
  });
});
