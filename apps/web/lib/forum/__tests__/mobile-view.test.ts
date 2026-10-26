import { describe, expect, it } from "vitest";
import type { ForumAuthor, ForumPostView, ForumTopicSummary } from "@cyberlearn/db";
import { pageParam, toMobileCategory, toMobilePost, toMobileTopicSummary } from "../mobile-view";

const AUTHOR: ForumAuthor = {
  id: "user-2",
  username: "sam",
  displayName: "",
  avatarUrl: "__upload:user-2/avatar.png",
  level: 7,
  role: "TEACHER",
};

const TOPIC: ForumTopicSummary = {
  id: "topic-1",
  slug: "subnetting",
  title: "Subnetting",
  pinned: true,
  locked: false,
  replyCount: 3,
  createdAt: new Date("2026-09-20T08:00:00.000Z"),
  lastPostAt: new Date("2026-09-24T09:30:00.000Z"),
  categorySlug: "reseau",
  categoryName: "Réseau",
  categoryAccent: "#4D8BFF",
  author: AUTHOR,
  preview: "Comment on calcule…",
};

describe("toMobileTopicSummary", () => {
  it("sends dates as ISO strings and signs the author as the site does", () => {
    const out = toMobileTopicSummary(TOPIC);
    expect(out.createdAt).toBe("2026-09-20T08:00:00.000Z");
    expect(out.lastPostAt).toBe("2026-09-24T09:30:00.000Z");
    expect(out.author).toEqual({
      id: "user-2",
      name: "sam",
      level: 7,
      role: "TEACHER",
      isFriend: false,
    });
  });

  it("marks an author who is one of the reader's friends", () => {
    expect(toMobileTopicSummary(TOPIC, new Set(["user-2"])).author?.isFriend).toBe(true);
    expect(toMobileTopicSummary(TOPIC, new Set(["user-9"])).author?.isFriend).toBe(false);
  });

  it("never sends the stored avatar value", () => {
    expect(JSON.stringify(toMobileTopicSummary(TOPIC))).not.toContain("__upload");
  });

  it("names a deleted account", () => {
    expect(toMobileTopicSummary({ ...TOPIC, author: null }).author).toBeNull();
  });
});

describe("toMobilePost", () => {
  const NONE_OPEN: ReadonlySet<string> = new Set();
  const post: ForumPostView = {
    id: "post-1",
    content: "Réponse",
    createdAt: new Date("2026-09-24T09:30:00.000Z"),
    editedAt: null,
    isHidden: false,
    removal: null,
    author: AUTHOR,
  };

  it("marks the reader's own post, and only theirs", () => {
    expect(toMobilePost(post, "user-2", null, NONE_OPEN).mine).toBe(true);
    expect(toMobilePost(post, "user-1", null, NONE_OPEN).mine).toBe(false);
    expect(toMobilePost({ ...post, author: null }, "user-1", null, NONE_OPEN).mine).toBe(false);
  });

  it("hands over the author's handle only when the reader may open the profile", () => {
    expect(toMobilePost(post, "user-1", null, new Set(["user-2"])).authorHandle).toBe("sam");
    // A private profile the reader is not let into: the name stays a name.
    expect(toMobilePost(post, "user-1", null, NONE_OPEN).authorHandle).toBeNull();
    expect(
      toMobilePost({ ...post, author: null }, "user-1", null, new Set(["user-2"])).authorHandle,
    ).toBeNull();
  });

  it("tells the app why one of the reader's own posts is out of the thread", () => {
    // Withdrawn, held for a moderator, hidden by one: three different things,
    // all `hidden`, and the app says which.
    for (const removal of ["WITHDRAWN", "HELD", "MODERATED"] as const) {
      const out = toMobilePost({ ...post, isHidden: true, removal }, "user-2", null, NONE_OPEN);
      expect(out).toMatchObject({ hidden: true, removal });
    }
    expect(toMobilePost(post, "user-2", null, NONE_OPEN).removal).toBeNull();
  });

  it("carries the signed avatar it was given, and the edit date", () => {
    const out = toMobilePost(
      { ...post, editedAt: new Date("2026-09-24T10:00:00.000Z"), isHidden: true },
      "user-2",
      "https://storage.example/signed",
      NONE_OPEN,
    );
    expect(out).toMatchObject({
      avatar: "https://storage.example/signed",
      editedAt: "2026-09-24T10:00:00.000Z",
      hidden: true,
    });
  });
});

describe("toMobileCategory", () => {
  it("keeps an empty section's missing date as null", () => {
    expect(
      toMobileCategory({
        id: "c",
        slug: "reseau",
        name: "Réseau",
        description: "…",
        accent: "#fff",
        topicCount: 0,
        lastPostAt: null,
      }).lastPostAt,
    ).toBeNull();
  });
});

describe("pageParam", () => {
  it.each([
    [null, 1],
    ["", 1],
    ["abc", 1],
    ["0", 1],
    ["-3", 1],
    ["2", 2],
    ["99999", 1],
  ])("reads %s as page %s", (value, page) => {
    expect(pageParam(value)).toBe(page);
  });
});
