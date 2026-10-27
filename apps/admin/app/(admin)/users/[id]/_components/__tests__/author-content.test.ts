import { describe, expect, it } from "vitest";
import type { AuditRow, ReportAgainstAuthor, ReviewableContent } from "@cyberlearn/db";
import { AUDIT_ACTION } from "@cyberlearn/db/audit-actions";
import { EXCERPT_MAX, authorContentHref, gestureLine, reportLine } from "../author-content";

/**
 * What an account's page says of the contents it published: the reports they
 * drew, and what the console did to them. Words only.
 */

const DAY = new Date("2026-10-05T10:00:00Z");

function report(overrides: Partial<ReportAgainstAuthor> = {}): ReportAgainstAuthor {
  return {
    id: "r-1",
    surface: "LESSON_ANSWER",
    reason: "HATE",
    status: "OPEN",
    createdAt: DAY,
    content: null,
    ...overrides,
  };
}

/** A content as the reports read it, whole, so no test has to say what it does not use. */
function content(overrides: Partial<ReviewableContent> = {}): ReviewableContent {
  return {
    surface: "LESSON_ANSWER",
    id: "a-1",
    text: "Une réponse.",
    isHidden: false,
    createdAt: DAY,
    author: null,
    context: "Sous une leçon",
    learnerPath: null,
    consolePath: null,
    opensThread: false,
    threadId: null,
    replies: 0,
    authorWithdrew: false,
    pendingReview: false,
    ...overrides,
  };
}

function entry(overrides: Partial<AuditRow> = {}): AuditRow {
  return {
    id: "e-1",
    action: AUDIT_ACTION.content.hide,
    actorId: "admin-1",
    anonymized: false,
    targetType: "FORUM_POST",
    targetId: "post-1",
    metadata: {
      authorId: "author-1",
      context: "Dans le sujet « Subnetting »",
      excerpt: "Un message\ninsultant.",
      reportsClosed: 2,
    },
    createdAt: DAY,
    actor: { username: "root", displayName: "Root", email: "root@example.test", avatarUrl: null },
    ...overrides,
  };
}

describe("reportLine", () => {
  it("names the kind of content and the reason it was reported for", () => {
    expect(reportLine(report()).title).toBe(
      "Réponse sous une leçon · Propos insultants ou haineux",
    );
  });

  it("says where the content lives and what it says, on one line", () => {
    const line = reportLine(
      report({
        content: content({
          text: "Première ligne.\n\n  Seconde ligne.",
          context: "Sous « Sous-réseaux »",
        }),
      }),
    );
    expect(line.detail).toBe("Sous « Sous-réseaux » : Première ligne. Seconde ligne.");
  });

  it("cuts a long content short", () => {
    const line = reportLine(
      report({ content: content({ text: "x".repeat(EXCERPT_MAX + 50), context: "Ici" }) }),
    );
    expect(line.detail).toBe(`Ici : ${"x".repeat(EXCERPT_MAX)}…`);
  });

  it("has no detail once the content is gone", () => {
    expect(reportLine(report({ content: null })).detail).toBeNull();
  });

  it("gives each state of a report its word", () => {
    const labels = (["OPEN", "HIDDEN", "DELETED", "DISMISSED"] as const).map(
      (status) => reportLine(report({ status })).status.label,
    );
    expect(labels).toEqual(["à traiter", "masqué", "supprimé", "classé"]);
    expect(reportLine(report({ status: "OPEN" })).status.tone).toBe("warning");
  });
});

describe("gestureLine", () => {
  it("names the gesture, the kind of content, where it was and who did it", () => {
    const line = gestureLine(entry());
    expect(line).toMatchObject({
      title: "Message du forum",
      by: "root",
      gesture: { label: "masqué" },
    });
    expect(line.detail).toBe("Dans le sujet « Subnetting » : Un message insultant.");
  });

  it("tells the three gestures apart", () => {
    const labels = [
      AUDIT_ACTION.content.hide,
      AUDIT_ACTION.content.restore,
      AUDIT_ACTION.content.delete,
    ].map((action) => gestureLine(entry({ action })).gesture.label);
    expect(labels).toEqual(["masqué", "réaffiché", "supprimé"]);
  });

  it("keeps what the journal kept of a deleted content, the only copy left", () => {
    const line = gestureLine(entry({ action: AUDIT_ACTION.content.delete }));
    expect(line.detail).toContain("Un message insultant.");
  });

  it("copes with an entry whose metadata is empty or not an object", () => {
    expect(gestureLine(entry({ metadata: null })).detail).toBeNull();
    expect(gestureLine(entry({ metadata: ["x"] })).detail).toBeNull();
    expect(gestureLine(entry({ metadata: { excerpt: 4 } })).detail).toBeNull();
  });

  it("says who did it when the account is gone", () => {
    expect(gestureLine(entry({ actor: null, anonymized: true })).by).toBe("compte supprimé");
  });

  it("prints a kind of content it does not know as it was written", () => {
    expect(gestureLine(entry({ targetType: "SOMETHING_NEW" })).title).toBe("SOMETHING_NEW");
  });
});

describe("authorContentHref", () => {
  const AUTHOR = "44444444-4444-4444-8444-444444444444";
  const EARLIER = new Date("2026-10-01T10:00:00Z");
  const LATER = new Date("2026-10-09T10:00:00Z");

  it("narrows the list to the account itself, not to a search on its name", () => {
    const href = authorContentHref(AUTHOR, [], []);
    const query = new URLSearchParams(href.split("?")[1]);
    expect(href.startsWith("/moderation/content?")).toBe(true);
    expect(query.get("author")).toBe(AUTHOR);
    expect(query.has("q")).toBe(false);
  });

  it("opens on the forum when nothing was reported or done", () => {
    expect(authorContentHref(AUTHOR, [], [])).toBe(`/moderation/content?author=${AUTHOR}`);
  });

  it("opens on the surface of the latest report", () => {
    const href = authorContentHref(AUTHOR, [report({ surface: "CHALLENGE_WRITEUP" })], []);
    expect(href).toBe(`/moderation/content?surface=CHALLENGE_WRITEUP&author=${AUTHOR}`);
  });

  it("opens on the surface of the latest gesture when it is newer than the latest report", () => {
    const href = authorContentHref(
      AUTHOR,
      [report({ surface: "LESSON_ANSWER", createdAt: EARLIER })],
      [entry({ targetType: "CLASS_RESOURCE", createdAt: LATER })],
    );
    expect(new URLSearchParams(href.split("?")[1]).get("surface")).toBe("CLASS_RESOURCE");
  });

  it("opens on the report's surface when it is newer than the latest gesture", () => {
    const href = authorContentHref(
      AUTHOR,
      [report({ surface: "LESSON_ANSWER", createdAt: LATER })],
      [entry({ targetType: "CLASS_RESOURCE", createdAt: EARLIER })],
    );
    expect(new URLSearchParams(href.split("?")[1]).get("surface")).toBe("LESSON_ANSWER");
  });

  it("ignores a gesture on a kind of content it does not know", () => {
    const href = authorContentHref(AUTHOR, [], [entry({ targetType: "SOMETHING_NEW" })]);
    expect(href).toBe(`/moderation/content?author=${AUTHOR}`);
  });
});
