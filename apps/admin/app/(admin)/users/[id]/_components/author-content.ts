import type { AuditRow, ContentSurface, ReportAgainstAuthor } from "@cyberlearn/db";
import { AUDIT_ACTION } from "@cyberlearn/db/audit-actions";
import {
  CONTENT_REPORT_REASON_LABELS,
  CONTENT_SURFACE_LABEL,
  isContentReportSurface,
} from "@cyberlearn/lib/moderation/report-reasons";
import type { Tone } from "../../../_components/admin-ui";
import { auditActorName } from "@/lib/audit-export";
import { gridHref } from "@/lib/grid-href";
import { DEFAULT_CONTENT_SURFACE, contentListSearch } from "@/lib/list-params";

/**
 * What an account's page says of the contents it published, the way
 * /moderation says it: the reports they received, and what the console did
 * to them. Words only; the reads are contentReportRepository.againstAuthor
 * and auditLogRepository.contentGesturesOnAuthor.
 */

/** The longest stretch of a content the page prints. */
export const EXCERPT_MAX = 140;

function excerptOf(text: string): string {
  return text.length > EXCERPT_MAX ? `${text.slice(0, EXCERPT_MAX)}…` : text;
}

/** A surface in the console's words; an unknown one as it was written. */
function surfaceLabel(surface: string): string {
  return isContentReportSurface(surface) ? CONTENT_SURFACE_LABEL[surface] : surface;
}

const REPORT_STATUS: Record<ReportAgainstAuthor["status"], { label: string; tone: Tone }> = {
  OPEN: { label: "à traiter", tone: "warning" },
  HIDDEN: { label: "masqué", tone: "danger" },
  DELETED: { label: "supprimé", tone: "danger" },
  DISMISSED: { label: "classé", tone: "neutral" },
};

export interface ReportLine {
  id: string;
  /** Which kind of content, then the reason it was reported for. */
  title: string;
  /** Where it lives and what it says; null once the content is gone. */
  detail: string | null;
  at: Date;
  status: { label: string; tone: Tone };
}

export function reportLine(report: ReportAgainstAuthor): ReportLine {
  const { content } = report;
  return {
    id: report.id,
    title: `${surfaceLabel(report.surface)} · ${CONTENT_REPORT_REASON_LABELS[report.reason]}`,
    detail:
      content === null
        ? null
        : `${content.context} : ${excerptOf(content.text.replace(/\s+/gu, " "))}`,
    at: report.createdAt,
    status: REPORT_STATUS[report.status],
  };
}

const GESTURE: Record<string, { label: string; tone: Tone }> = {
  [AUDIT_ACTION.content.hide]: { label: "masqué", tone: "warning" },
  [AUDIT_ACTION.content.restore]: { label: "réaffiché", tone: "neutral" },
  [AUDIT_ACTION.content.delete]: { label: "supprimé", tone: "danger" },
};

export interface GestureLine {
  id: string;
  title: string;
  /** The journal keeps a short copy of the text: the only one left after a deletion. */
  detail: string | null;
  by: string;
  at: Date;
  gesture: { label: string; tone: Tone };
}

/** A string kept in an entry's metadata, or null when it is not one. */
function metadataText(metadata: AuditRow["metadata"], key: string): string | null {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) return null;
  const value = metadata[key];
  return typeof value === "string" && value !== "" ? value : null;
}

export function gestureLine(row: AuditRow): GestureLine {
  const context = metadataText(row.metadata, "context");
  const excerpt = metadataText(row.metadata, "excerpt");
  const detail = [context, excerpt === null ? null : excerptOf(excerpt.replace(/\s+/gu, " "))]
    .filter((part): part is string => part !== null)
    .join(" : ");
  return {
    id: row.id,
    title: surfaceLabel(row.targetType),
    detail: detail === "" ? null : detail,
    by: auditActorName(row),
    at: row.createdAt,
    gesture: GESTURE[row.action] ?? { label: row.action, tone: "neutral" },
  };
}

/**
 * The contents list, narrowed to what this account wrote. The list shows one
 * surface at a time and opens on the forum's: an account whose latest report
 * or gesture is on a write-up would land on an empty forum tab, so the link
 * opens on the surface of the most recent of them, and the tabs reach the rest.
 */
export function authorContentHref(
  authorId: string,
  reports: readonly Pick<ReportAgainstAuthor, "surface" | "createdAt">[],
  gestures: readonly Pick<AuditRow, "targetType" | "createdAt">[],
): string {
  // Both lists come newest first: their first line is each one's latest.
  const candidates: { surface: ContentSurface; at: Date }[] = [];
  const report = reports[0];
  if (report !== undefined) candidates.push({ surface: report.surface, at: report.createdAt });
  const gesture = gestures[0];
  if (gesture !== undefined && isContentReportSurface(gesture.targetType)) {
    candidates.push({ surface: gesture.targetType, at: gesture.createdAt });
  }
  const latest = candidates.sort((a, b) => b.at.getTime() - a.at.getTime())[0];
  return gridHref(
    "/moderation/content",
    contentListSearch({
      surface: latest?.surface ?? DEFAULT_CONTENT_SURFACE,
      state: undefined,
      q: "",
      author: authorId,
      page: 1,
    }),
  );
}
