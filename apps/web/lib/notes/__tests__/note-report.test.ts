import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as Db from "@cyberlearn/db";
import { NOTE_REPORT_REASON_KEYS } from "@cyberlearn/lib/notes/report-reasons";

/**
 * A recipient reporting a received note: a real reason, a short comment,
 * limited per hour, and only for a note that was shared with them.
 */

const NOTE = "22222222-2222-4222-8222-222222222222";

const m = vi.hoisted(() => ({
  report: vi.fn(),
  countSince: vi.fn(),
}));

vi.mock("@cyberlearn/db", () => ({
  NOTE_REPORT_REASONS: ["HATE", "SEXUAL", "SPAM", "PERSONAL_DATA", "OTHER"],
  noteReportRepository: { report: m.report, countSince: m.countSince },
}));

const { reportSharedNoteFor, NOTE_REPORTS_PER_HOUR } = await import("../note-report");

beforeEach(() => {
  vi.clearAllMocks();
  m.countSince.mockResolvedValue(0);
  m.report.mockResolvedValue(true);
});

describe("reportSharedNoteFor", () => {
  it("records the report with its reason and trimmed comment", async () => {
    const result = await reportSharedNoteFor("user-1", {
      noteId: NOTE,
      reason: "HATE",
      comment: "  Insultes envers la classe.  ",
    });
    expect(result).toEqual({ ok: true });
    expect(m.report).toHaveBeenCalledWith("user-1", NOTE, "HATE", "Insultes envers la classe.");
  });

  it("stores no comment rather than an empty one", async () => {
    await reportSharedNoteFor("user-1", { noteId: NOTE, reason: "SPAM", comment: "   " });
    expect(m.report).toHaveBeenCalledWith("user-1", NOTE, "SPAM", null);
  });

  it("refuses a note that is not, or no longer, shared with the reporter", async () => {
    m.report.mockResolvedValue(false);
    expect(await reportSharedNoteFor("user-1", { noteId: NOTE, reason: "OTHER" })).toEqual({
      ok: false,
      error: "Cette note n'est plus partagée avec toi.",
    });
  });

  it("refuses a reason the form does not offer, or a malformed id, before any read", async () => {
    expect((await reportSharedNoteFor("user-1", { noteId: NOTE, reason: "RUDE" })).ok).toBe(false);
    expect((await reportSharedNoteFor("user-1", { noteId: "abc", reason: "HATE" })).ok).toBe(false);
    expect(m.countSince).not.toHaveBeenCalled();
    expect(m.report).not.toHaveBeenCalled();
  });

  it("refuses a comment longer than the team reads", async () => {
    const result = await reportSharedNoteFor("user-1", {
      noteId: NOTE,
      reason: "OTHER",
      comment: "x".repeat(501),
    });
    expect(result.ok).toBe(false);
    expect(m.report).not.toHaveBeenCalled();
  });

  it("stops at the hourly limit, and writes nothing", async () => {
    m.countSince.mockResolvedValue(NOTE_REPORTS_PER_HOUR);
    const result = await reportSharedNoteFor("user-1", { noteId: NOTE, reason: "HATE" });
    expect(result.ok).toBe(false);
    expect(m.report).not.toHaveBeenCalled();
  });

  it("offers in the forms exactly the reasons the database takes", async () => {
    // The real module, not the mock above: the list it exports is checked
    // against the Prisma enum when packages/db typechecks.
    const db = await vi.importActual<typeof Db>("@cyberlearn/db");
    expect([...NOTE_REPORT_REASON_KEYS]).toEqual([...db.NOTE_REPORT_REASONS]);
  }, 30_000); // Loads the real Prisma client: slow when the whole suite runs at once.
});
