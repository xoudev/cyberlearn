import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as Db from "@cyberlearn/db";
import {
  CONTENT_REPORT_REASON_KEYS,
  CONTENT_REPORT_SURFACE_KEYS,
} from "@cyberlearn/lib/moderation/report-reasons";

/**
 * A learner reporting what somebody else published: a real surface and
 * reason, a short comment, limited per hour, only for what they can see and
 * never their own.
 */

const POST = "22222222-2222-4222-8222-222222222222";

const m = vi.hoisted(() => ({
  report: vi.fn(),
  countSince: vi.fn(),
  reportable: vi.fn(),
}));

vi.mock("@cyberlearn/db", () => ({
  CONTENT_SURFACES: [
    "FORUM_POST",
    "LESSON_QUESTION",
    "LESSON_ANSWER",
    "CHALLENGE_WRITEUP",
    "CLASS_RESOURCE",
  ],
  CONTENT_REPORT_REASONS: ["HATE", "SEXUAL", "SPAM", "PERSONAL_DATA", "OTHER"],
  contentReportRepository: { report: m.report, countSince: m.countSince },
  contentModerationRepository: { reportable: m.reportable },
}));

const { reportContentFor, CONTENT_REPORTS_PER_HOUR } = await import("../content-report");

beforeEach(() => {
  vi.clearAllMocks();
  m.countSince.mockResolvedValue(0);
  m.reportable.mockResolvedValue({ authorId: "author-1" });
  m.report.mockResolvedValue(undefined);
});

describe("reportContentFor", () => {
  it("records the report with its reason and trimmed comment", async () => {
    const result = await reportContentFor("user-1", {
      surface: "FORUM_POST",
      contentId: POST,
      reason: "HATE",
      comment: "  Insultes envers un membre.  ",
    });
    expect(result).toEqual({ ok: true });
    expect(m.reportable).toHaveBeenCalledWith("FORUM_POST", POST, "user-1");
    expect(m.report).toHaveBeenCalledWith({
      reporterId: "user-1",
      surface: "FORUM_POST",
      contentId: POST,
      reason: "HATE",
      comment: "Insultes envers un membre.",
    });
  });

  it("stores no comment rather than an empty one", async () => {
    await reportContentFor("user-1", {
      surface: "LESSON_ANSWER",
      contentId: POST,
      reason: "SPAM",
      comment: "   ",
    });
    expect(m.report).toHaveBeenCalledWith(expect.objectContaining({ comment: null }));
  });

  it("refuses what the reporter cannot see, and writes nothing", async () => {
    m.reportable.mockResolvedValue(null);
    expect(
      await reportContentFor("user-1", {
        surface: "CHALLENGE_WRITEUP",
        contentId: POST,
        reason: "OTHER",
      }),
    ).toEqual({ ok: false, error: "Ce contenu n'est plus disponible." });
    expect(m.report).not.toHaveBeenCalled();
  });

  it("refuses the reporter's own content", async () => {
    m.reportable.mockResolvedValue({ authorId: "user-1" });
    const result = await reportContentFor("user-1", {
      surface: "LESSON_QUESTION",
      contentId: POST,
      reason: "SPAM",
    });
    expect(result.ok).toBe(false);
    expect(m.report).not.toHaveBeenCalled();
  });

  it("takes a report on content whose author's account was erased", async () => {
    m.reportable.mockResolvedValue({ authorId: null });
    expect(
      await reportContentFor("user-1", { surface: "FORUM_POST", contentId: POST, reason: "HATE" }),
    ).toEqual({ ok: true });
  });

  it("refuses a surface, a reason or an id it does not know, before any read", async () => {
    for (const input of [
      { surface: "NOTE", contentId: POST, reason: "HATE" },
      { surface: "FORUM_POST", contentId: POST, reason: "RUDE" },
      { surface: "FORUM_POST", contentId: "abc", reason: "HATE" },
      { surface: "FORUM_POST", contentId: POST, reason: "HATE", comment: "x".repeat(501) },
      null,
    ]) {
      expect((await reportContentFor("user-1", input)).ok).toBe(false);
    }
    expect(m.countSince).not.toHaveBeenCalled();
    expect(m.reportable).not.toHaveBeenCalled();
    expect(m.report).not.toHaveBeenCalled();
  });

  it("stops at the hourly limit, and writes nothing", async () => {
    m.countSince.mockResolvedValue(CONTENT_REPORTS_PER_HOUR);
    const result = await reportContentFor("user-1", {
      surface: "FORUM_POST",
      contentId: POST,
      reason: "HATE",
    });
    expect(result.ok).toBe(false);
    expect(m.reportable).not.toHaveBeenCalled();
    expect(m.report).not.toHaveBeenCalled();
  });

  it("offers in the forms exactly the surfaces and reasons the database takes", async () => {
    // The real module, not the mock above: the lists it exports are checked
    // against the Prisma enums when packages/db typechecks.
    const db = await vi.importActual<typeof Db>("@cyberlearn/db");
    expect([...CONTENT_REPORT_REASON_KEYS]).toEqual([...db.CONTENT_REPORT_REASONS]);
    expect([...CONTENT_REPORT_SURFACE_KEYS]).toEqual([...db.CONTENT_SURFACES]);
  }, 30_000); // Loads the real Prisma client: slow when the whole suite runs at once.
});
