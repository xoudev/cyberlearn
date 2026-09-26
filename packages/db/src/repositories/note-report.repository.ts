import type { NoteReportReason } from "@prisma/client";
import { prisma } from "../prisma.js";

export const NOTE_REPORT_REASONS = [
  "HATE",
  "SEXUAL",
  "SPAM",
  "PERSONAL_DATA",
  "OTHER",
] as const satisfies readonly NoteReportReason[];
export type NoteReportReasonValue = (typeof NOTE_REPORT_REASONS)[number];

// Fails to compile when the schema gains a reason this list does not have.
const everyReasonListed: Record<Exclude<NoteReportReason, NoteReportReasonValue>, never> = {};
void everyReasonListed;

/** What the console can do with a reported note. */
export type NoteReportOutcome = "UNSHARED" | "DISMISSED";

/** One note's open reports, as the console lists them. */
export interface ReportedNote {
  noteId: string;
  content: string;
  lessonTitle: string;
  /** The author, named for the team only. Null once the account is erased. */
  authorUsername: string | null;
  authorDisplayName: string | null;
  /** How many people still hold it. */
  shareCount: number;
  reports: {
    id: string;
    reason: NoteReportReasonValue;
    comment: string | null;
    createdAt: Date;
    /** Null once the reporter's account is erased. */
    reporterUsername: string | null;
  }[];
}

export const noteReportRepository = {
  /**
   * Records a recipient's report and takes the note out of their "Reçues", in
   * one transaction. Returns false, writing nothing, when the note was not
   * shared with them: only a recipient can report what they were handed.
   *
   * Reporting the same note again replaces the reason and comment and reopens
   * the report, as for a quiz report.
   */
  async report(
    reporterId: string,
    noteId: string,
    reason: NoteReportReasonValue,
    comment: string | null,
  ): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const { count } = await tx.noteShare.deleteMany({
        where: { noteId, sharedWithId: reporterId },
      });
      if (count === 0) return false;
      await tx.noteReport.upsert({
        where: { reporterId_noteId: { reporterId, noteId } },
        create: { reporterId, noteId, reason, comment },
        update: { reason, comment, status: "OPEN", resolvedAt: null },
      });
      return true;
    });
  },

  /** How many reports this person filed or changed since `since`: the rate limit. */
  async countSince(reporterId: string, since: Date): Promise<number> {
    return prisma.noteReport.count({ where: { reporterId, updatedAt: { gte: since } } });
  },

  /** Notes with at least one open report. */
  async countOpenNotes(): Promise<number> {
    const rows = await prisma.noteReport.groupBy({ by: ["noteId"], where: { status: "OPEN" } });
    return rows.length;
  },

  /** Open reports grouped by note, the most reported first. */
  async openByNote(): Promise<ReportedNote[]> {
    const rows = await prisma.noteReport.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        noteId: true,
        reason: true,
        comment: true,
        createdAt: true,
        reporter: { select: { username: true } },
        note: {
          select: {
            content: true,
            lesson: { select: { title: true } },
            user: { select: { username: true, displayName: true } },
            _count: { select: { shares: true } },
          },
        },
      },
    });
    const groups = new Map<string, ReportedNote>();
    for (const r of rows) {
      let group = groups.get(r.noteId);
      if (!group) {
        group = {
          noteId: r.noteId,
          content: r.note.content,
          lessonTitle: r.note.lesson.title,
          authorUsername: r.note.user.username,
          authorDisplayName: r.note.user.displayName,
          shareCount: r.note._count.shares,
          reports: [],
        };
        groups.set(r.noteId, group);
      }
      group.reports.push({
        id: r.id,
        reason: r.reason,
        comment: r.comment,
        createdAt: r.createdAt,
        reporterUsername: r.reporter?.username ?? null,
      });
    }
    return [...groups.values()].sort((a, b) => b.reports.length - a.reports.length);
  },

  /**
   * Closes every open report on a note. UNSHARED also takes the note back from
   * everybody it was shared with, in the same transaction; the author keeps it.
   * DISMISSED leaves the shares as they are.
   */
  async resolveNote(
    noteId: string,
    outcome: NoteReportOutcome,
  ): Promise<{ reports: number; sharesRemoved: number }> {
    return prisma.$transaction(async (tx) => {
      const sharesRemoved =
        outcome === "UNSHARED" ? (await tx.noteShare.deleteMany({ where: { noteId } })).count : 0;
      const { count } = await tx.noteReport.updateMany({
        where: { noteId, status: "OPEN" },
        data: { status: outcome, resolvedAt: new Date() },
      });
      return { reports: count, sharesRemoved };
    });
  },
};
