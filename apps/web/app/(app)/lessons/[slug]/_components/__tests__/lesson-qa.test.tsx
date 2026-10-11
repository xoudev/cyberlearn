import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The forms post through server actions; nothing here submits one.
vi.mock("../qa-forms", () => ({
  PostQuestionForm: () => null,
  PostAnswerForm: () => null,
  AcceptAnswerButton: () => null,
  UpvoteButton: () => null,
}));

const { LessonQA, UserPill } = await import("../lesson-qa");

const FRIEND = "friend-1";
const STRANGER = "stranger-1";

describe("UserPill", () => {
  it("marks the author of a question or an answer who is the reader's friend", () => {
    const html = renderToStaticMarkup(
      <UserPill
        user={{ id: FRIEND, displayName: "Alex", username: "alex", level: 4 }}
        friendIds={new Set([FRIEND])}
      />,
    );
    expect(html).toContain('aria-label="Ami"');
  });

  it("marks nobody else, nor a deleted account", () => {
    const friends = new Set([FRIEND]);
    expect(
      renderToStaticMarkup(
        <UserPill
          user={{ id: STRANGER, displayName: "Sam", username: "sam", level: 2 }}
          friendIds={friends}
        />,
      ),
    ).not.toContain('aria-label="Ami"');
    expect(renderToStaticMarkup(<UserPill user={null} friendIds={friends} />)).not.toContain(
      'aria-label="Ami"',
    );
  });
});

describe("LessonQA", () => {
  it("passes the reader's friends down to the answers", () => {
    const at = new Date("2026-10-01T10:00:00Z");
    const html = renderToStaticMarkup(
      <LessonQA
        lessonId="l1"
        lessonSlug="lecon"
        currentUserId="me"
        friendIds={new Set([FRIEND])}
        questions={[
          {
            id: "q1",
            title: "Pourquoi ?",
            content: "Je ne comprends pas.",
            isResolved: false,
            createdAt: at,
            user: { id: STRANGER, displayName: "Sam", username: "sam", level: 2 },
            _count: { answers: 1 },
            answers: [
              {
                id: "a1",
                content: "Parce que.",
                isAccepted: false,
                upvotes: 0,
                createdAt: at,
                user: { id: FRIEND, displayName: "Alex", username: "alex", level: 4 },
              },
            ],
          },
        ]}
      />,
    );
    expect(html.split('aria-label="Ami"').length - 1).toBe(1);
  });
});
