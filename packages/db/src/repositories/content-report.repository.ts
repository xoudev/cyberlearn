import type { ContentReportReason } from "@prisma/client";
import { prisma } from "../prisma.js";
import {
  CONTENT_SURFACES,
  contentModerationRepository,
  type ContentSurface,
  type ModeratedContent,
} from "./content-moderation.repository.js";

export const CONTENT_REPORT_REASONS = [
  "HATE",
  "SEXUAL",
  "SPAM",
  "PERSONAL_DATA",
  "OTHER",
] as const satisfies readonly ContentReportReason[];
export type ContentReportReasonValue = (typeof CONTENT_REPORT_REASONS)[number];

// Fails to compile when the schema gains a reason this list does not have.
const everyReasonListed: [Exclude<ContentReportReason, ContentReportReasonValue>] extends [never]
  ? true
  : never = true;
// eslint-disable-next-line @typescript-eslint/no-meaningless-void-operator -- marks the compile-time check as used; it has no runtime value to discard.
void everyReasonListed;

/** One piece of content's open reports, as the console's queue lists them. */
export interface ReportedContent {
  surface: ContentSurface;
  contentId: string;
  /**
   * The content as it is now; null when it no longer exists (its author's
   * account was erased with it, or a teacher removed their resource), and
   * the reports can only be closed.
   */
  content: ModeratedContent | null;
  reports: {
    id: string;
    reason: ContentReportReasonValue;
    comment: string | null;
    createdAt: Date;
    /** Null once the reporter's account is erased. */
    reporterUsername: string | null;
  }[];
}

export const contentReportRepository = {
  /**
   * Records a report. The caller has checked that the reporter can see the
   * content and did not write it (contentModerationRepository.reportable).
   *
   * Reporting the same content again replaces the reason and the comment and
   * reopens the report, as for a note: a content shown again after a first
   * report can be reported again.
   */
  async report(input: {
    reporterId: string;
    surface: ContentSurface;
    contentId: string;
    reason: ContentReportReasonValue;
    comment: string | null;
  }): Promise<void> {
    const { reporterId, surface, contentId, reason, comment } = input;
    await prisma.contentReport.upsert({
      where: { reporterId_surface_contentId: { reporterId, surface, contentId } },
      create: { reporterId, surface, contentId, reason, comment },
      update: { reason, comment, status: "OPEN", resolvedAt: null, resolvedById: null },
    });
  },

  /** How many reports this person filed or changed since `since`: the rate limit. */
  async countSince(reporterId: string, since: Date): Promise<number> {
    return prisma.contentReport.count({ where: { reporterId, updatedAt: { gte: since } } });
  },

  /** Contents with at least one open report. */
  async countOpenContents(): Promise<number> {
    const rows = await prisma.contentReport.groupBy({
      by: ["surface", "contentId"],
      where: { status: "OPEN" },
    });
    return rows.length;
  },

  /**
   * Open reports grouped by content, the most reported first and, among
   * equals, the one waiting longest. Each group carries the content as it is
   * now, read from its own table.
   */
  async openByContent(): Promise<ReportedContent[]> {
    const rows = await prisma.contentReport.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        surface: true,
        contentId: true,
        reason: true,
        comment: true,
        createdAt: true,
        reporter: { select: { username: true } },
      },
    });

    const groups = new Map<string, ReportedContent>();
    for (const r of rows) {
      const key = `${r.surface}:${r.contentId}`;
      let group = groups.get(key);
      if (group === undefined) {
        group = { surface: r.surface, contentId: r.contentId, content: null, reports: [] };
        groups.set(key, group);
      }
      group.reports.push({
        id: r.id,
        reason: r.reason,
        comment: r.comment,
        createdAt: r.createdAt,
        reporterUsername: r.reporter?.username ?? null,
      });
    }

    // One read per surface for the whole queue, not one per report.
    const all = [...groups.values()];
    for (const surface of CONTENT_SURFACES) {
      const ids = all.filter((g) => g.surface === surface).map((g) => g.contentId);
      const contents = await contentModerationRepository.read(surface, ids);
      for (const content of contents) {
        const group = groups.get(`${surface}:${content.id}`);
        if (group !== undefined) group.content = content;
      }
    }

    // Stable: equal counts keep the order of their oldest report.
    return all.sort((a, b) => b.reports.length - a.reports.length);
  },
};
