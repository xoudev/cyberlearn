import { describe, expect, it } from "vitest";
import { contentExcerpt, contentGestureQuestion } from "../content-moderation";

/**
 * The question asked before a moderator's gesture: every one reaches the
 * author, and a deletion says what goes with the content.
 */

describe("contentGestureQuestion", () => {
  it("says the author will be told, whatever the gesture", () => {
    const answer = { surface: "LESSON_ANSWER", opensThread: false, replies: 0 } as const;
    expect(contentGestureQuestion("hide", answer)).toBe(
      "Masquer cette réponse ? Son auteur sera prévenu.",
    );
    expect(contentGestureQuestion("restore", answer)).toBe(
      "Réafficher cette réponse ? Son auteur sera prévenu.",
    );
    expect(contentGestureQuestion("delete", answer)).toBe(
      "Supprimer définitivement cette réponse ? Rien ne pourra être rétabli, et son auteur sera prévenu.",
    );
  });

  it("warns that a thread's opening message takes the thread", () => {
    const opening = { surface: "FORUM_POST", opensThread: true, replies: 4 } as const;
    expect(contentGestureQuestion("hide", opening)).toContain("le sujet entier sera masqué");
    expect(contentGestureQuestion("delete", opening)).toContain(
      "le sujet part avec lui, et ses 4 réponses",
    );
    expect(contentGestureQuestion("delete", { ...opening, replies: 0 })).toContain(
      "le sujet part avec lui.",
    );
  });

  it("warns that a question takes its answers", () => {
    const question = { surface: "LESSON_QUESTION", opensThread: false, replies: 1 } as const;
    expect(contentGestureQuestion("delete", question)).toContain("Sa réponse part avec elle.");
    expect(contentGestureQuestion("delete", { ...question, replies: 3 })).toContain(
      "Ses 3 réponses partent avec elle.",
    );
  });

  it("says nothing goes along with a reply", () => {
    const reply = { surface: "FORUM_POST", opensThread: false, replies: 0 } as const;
    expect(contentGestureQuestion("delete", reply)).not.toContain("sujet");
  });
});

describe("contentExcerpt", () => {
  it("keeps a short text whole, on one line", () => {
    expect(contentExcerpt("Bonjour\n\n  à tous")).toBe("Bonjour à tous");
  });

  it("cuts a long one, and names an empty one", () => {
    expect(contentExcerpt("x".repeat(300), 10)).toBe(`${"x".repeat(9)}…`);
    expect(contentExcerpt("   ")).toBe("(vide)");
  });
});
