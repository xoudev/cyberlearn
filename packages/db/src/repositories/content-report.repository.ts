import type { ContentReportReason } from "@prisma/client";
import { prisma } from "../prisma.js";
import {
  CONTENT_SURFACES,
  contentModerationRepository,
  type ContentSurface,
  type ReviewableContent,
} from "./content-moderation.repository.js";
import { readSlice, type ConsolePage, type ConsoleSlice } from "./console-page.js";

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
   * The content as it is now, with whether the screen's queue still holds
   * it; null when it no longer exists (its author's account was erased with
   * it, or a teacher removed their resource), and the reports can only be
   * closed.
   */
  content: ReviewableContent | null;
  reports: {
    id: string;
    reason: ContentReportReasonValue;
    comment: string | null;
    createdAt: Date;
    /** Null once the reporter's account is erased. */
    reporterUsername: string | null;
  }[];
}

/** One page of the report queue, one content per entry. */
export interface ReportQueue extends ConsoleSlice<ReportedContent> {
  /** Open reports over every page, where `total` counts contents. */
  openReports: number;
}

const OPEN = { status: "OPEN" } as const;

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
      update: {
        reason,
        comment,
        status: "OPEN",
        resolvedAt: null,
        resolvedById: null,
        reportedAt: new Date(),
      },
    });
  },

  /**
   * How many reports this person filed or filed again since `since`: the
   * rate limit. Read from reportedAt, which only the reporter moves: the
   * console closing their reports bumps updatedAt, and must not use up
   * their hour.
   */
  async countSince(reporterId: string, since: Date): Promise<number> {
    return prisma.contentReport.count({ where: { reporterId, reportedAt: { gte: since } } });
  },

  /** Contents with at least one open report. */
  async countOpenContents(): Promise<number> {
    const rows = await prisma.contentReport.groupBy({
      by: ["surface", "contentId"],
      where: OPEN,
    });
    return rows.length;
  },

  /**
   * One page of the open reports grouped by content, the most reported first
   * and, among equals, the one waiting longest. Each group carries the
   * content as it is now, read from its own table, and whether the screen's
   * queue still holds it. Paged by content, as the console's other lists are
   * by row: the database groups and pages, and only that page's reports are
   * read.
   */
  async openByContent(page: ConsolePage): Promise<ReportQueue> {
    const [slice, openReports] = await Promise.all([
      readSlice(
        page,
        () => contentReportRepository.countOpenContents(),
        (window) =>
          prisma.contentReport.groupBy({
            by: ["surface", "contentId"],
            where: OPEN,
            orderBy: [
              { _count: { id: "desc" } },
              { _min: { createdAt: "asc" } },
              { surface: "asc" },
              { contentId: "asc" },
            ],
            ...window,
          }),
      ),
      prisma.contentReport.count({ where: OPEN }),
    ]);
    if (slice.rows.length === 0) {
      return { rows: [], total: slice.total, page: slice.page, openReports };
    }

    const rows = await prisma.contentReport.findMany({
      where: {
        ...OPEN,
        OR: slice.rows.map((g) => ({ surface: g.surface, contentId: g.contentId })),
      },
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

    // In the page's order, which the database decided.
    const groups = new Map<string, ReportedContent>(
      slice.rows.map((g) => [
        `${g.surface}:${g.contentId}`,
        { surface: g.surface, contentId: g.contentId, content: null, reports: [] },
      ]),
    );
    for (const r of rows) {
      const group = groups.get(`${r.surface}:${r.contentId}`);
      if (group === undefined) continue;
      group.reports.push({
        id: r.id,
        reason: r.reason,
        comment: r.comment,
        createdAt: r.createdAt,
        reporterUsername: r.reporter?.username ?? null,
      });
    }

    // One read per surface for the whole page, not one per report.
    const all = [...groups.values()];
    for (const surface of CONTENT_SURFACES) {
      const ids = all.filter((g) => g.surface === surface).map((g) => g.contentId);
      const contents = await contentModerationRepository.read(surface, ids);
      for (const content of contents) {
        const group = groups.get(`${surface}:${content.id}`);
        if (group !== undefined) group.content = content;
      }
    }

    return { rows: all, total: slice.total, page: slice.page, openReports };
  },
};
