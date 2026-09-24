import { describe, expect, it } from "vitest";
import {
  canEditPost,
  canRemovePost,
  postDraftProblem,
  replyCountLabel,
  roleLabel,
  threadFromHref,
  topicCountLabel,
  topicDraftProblem,
  type ForumPost,
} from "../forum";

function post(overrides: Partial<ForumPost> = {}): ForumPost {
  return {
    id: "p-1",
    content: "Contenu",
    createdAt: "2026-09-24T09:30:00.000Z",
    editedAt: null,
    hidden: false,
    mine: false,
    author: null,
    avatar: null,
    ...overrides,
  };
}

describe("topicDraftProblem", () => {
  it("asks for the server's minimums, counted without margins", () => {
    const short = "Un titre de 8 caractères et un message de 10, au minimum.";
    expect(topicDraftProblem("Court", "Un message assez long")).toBe(short);
    expect(topicDraftProblem("Un bon titre", "   court   ")).toBe(short);
    expect(topicDraftProblem("12345678", "1234567890")).toBeNull();
  });

  it("caps the lengths where the server does", () => {
    expect(topicDraftProblem("t".repeat(161), "Un message assez long")).not.toBeNull();
    expect(topicDraftProblem("Un bon titre", "m".repeat(10_001))).not.toBeNull();
    expect(topicDraftProblem("t".repeat(160), "m".repeat(10_000))).toBeNull();
  });
});

describe("postDraftProblem", () => {
  it("uses the server's words for a short message", () => {
    expect(postDraftProblem("court")).toBe("Message trop court.");
    expect(postDraftProblem("1234567890")).toBeNull();
    expect(postDraftProblem("m".repeat(10_001))).not.toBeNull();
  });
});

describe("canEditPost / canRemovePost", () => {
  it("lets the author edit and take down a post that is still up", () => {
    expect(canEditPost(post({ mine: true }))).toBe(true);
    expect(canRemovePost(post({ mine: true }), false)).toBe(true);
  });

  it("lets an administrator take down, not edit, somebody else's post", () => {
    expect(canEditPost(post())).toBe(false);
    expect(canRemovePost(post(), true)).toBe(true);
    expect(canRemovePost(post(), false)).toBe(false);
  });

  it("offers nothing on a post already taken down", () => {
    expect(canEditPost(post({ mine: true, hidden: true }))).toBe(false);
    expect(canRemovePost(post({ mine: true, hidden: true }), true)).toBe(false);
  });
});

describe("labels", () => {
  it("names the roles the site names, and only those", () => {
    expect(roleLabel("TEACHER")).toBe("Professeur");
    expect(roleLabel("ADMIN")).toBe("Équipe");
    expect(roleLabel("LEARNER")).toBeNull();
  });

  it("agrees in number", () => {
    expect(replyCountLabel(0)).toBe("0 réponse");
    expect(replyCountLabel(1)).toBe("1 réponse");
    expect(replyCountLabel(2)).toBe("2 réponses");
    expect(topicCountLabel(3)).toBe("3 sujets");
  });
});

describe("threadFromHref", () => {
  it("reads a thread's address from the site's link", () => {
    expect(threadFromHref("/forum/reseau/subnetting-en-27")).toEqual({
      category: "reseau",
      slug: "subnetting-en-27",
    });
    expect(threadFromHref("/forum/reseau/subnetting?page=2")).toEqual({
      category: "reseau",
      slug: "subnetting",
    });
  });

  it("refuses anything else", () => {
    expect(threadFromHref("/forum/reseau")).toBeNull();
    expect(threadFromHref("/forum/reseau/a/b")).toBeNull();
    expect(threadFromHref("https://evil.example/forum/a/b")).toBeNull();
  });
});
