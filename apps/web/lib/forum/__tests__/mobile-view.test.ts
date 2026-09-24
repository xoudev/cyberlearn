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
    expect(out.author).toEqual({ id: "user-2", name: "sam", level: 7, role: "TEACHER" });
  });

  it("never sends the stored avatar value", () => {
    expect(JSON.stringify(toMobileTopicSummary(TOPIC))).not.toContain("__upload");
  });

  it("names a deleted account", () => {
    expect(toMobileTopicSummary({ ...TOPIC, author: null }).author).toBeNull();
  });
});

describe("toMobilePost", () => {
  const post: ForumPostView = {
    id: "post-1",
    content: "Réponse",
    createdAt: new Date("2026-09-24T09:30:00.000Z"),
    editedAt: null,
    isHidden: false,
    author: AUTHOR,
  };

  it("marks the reader's own post, and only theirs", () => {
    expect(toMobilePost(post, "user-2", null).mine).toBe(true);
    expect(toMobilePost(post, "user-1", null).mine).toBe(false);
    expect(toMobilePost({ ...post, author: null }, "user-1", null).mine).toBe(false);
  });

  it("carries the signed avatar it was given, and the edit date", () => {
    const out = toMobilePost(
      { ...post, editedAt: new Date("2026-09-24T10:00:00.000Z"), isHidden: true },
      "user-2",
      "https://storage.example/signed",
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
