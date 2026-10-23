import React from "react";
import Link from "next/link";
import type {
  AuditRow,
  moderationRepository,
  noteReportRepository,
  ReportAgainstAuthor,
} from "@cyberlearn/db";
import { NOTE_REPORT_REASON_LABELS } from "@cyberlearn/lib/notes/report-reasons";
import { Card, Tag, type Tone } from "../../../_components/admin-ui";
import { USER_CARDS } from "../../_components/columns";
import { SURFACE_LABEL } from "../../../moderation/surface-labels";
import { formatDay } from "../../_components/dates";
import { gestureLine, reportLine } from "./author-content";

type ModerationRow = Awaited<ReturnType<typeof moderationRepository.findForUser>>[number];
type NoteReportRow = Awaited<ReturnType<typeof noteReportRepository.againstAuthor>>[number];

const OUTCOME: Record<ModerationRow["outcome"], { label: string; tone: Tone }> = {
  PENDING: { label: "à relire", tone: "warning" },
  UPHELD: { label: "confirmé", tone: "danger" },
  OVERTURNED: { label: "faux positif", tone: "neutral" },
};

const REPORT_STATUS: Record<NoteReportRow["status"], { label: string; tone: Tone }> = {
  OPEN: { label: "à traiter", tone: "warning" },
  UNSHARED: { label: "note retirée", tone: "danger" },
  DISMISSED: { label: "classé", tone: "neutral" },
};

/**
 * A section's heading: the whole count, and when the list below stops short
 * of it, how many of them it shows. Support reads the number as a total.
 */
function heading(
  label: string,
  total: number,
  shown: number,
  latest: "derniers" | "dernières",
): string {
  return total > shown
    ? `${label} · ${String(total)}, les ${String(shown)} ${latest} ci-dessous`
    : `${label} · ${String(total)}`;
}

/**
 * What the platform flagged in this account's writing, what recipients
 * reported about the notes it shared, what others reported about the contents
 * it published, and what the console did to those. Read only: each is judged
 * in its own queue, which this links to.
 */
export function ModerationPanel({
  events,
  eventTotal,
  noteReports,
  noteReportTotal,
  contentReports,
  contentGestures,
  contentHref,
}: {
  /** The latest ones only. */
  events: ModerationRow[];
  eventTotal: number;
  /** The latest ones only. */
  noteReports: NoteReportRow[];
  noteReportTotal: number;
  /** Reports about the account's published contents: the latest ones, and how many in all. */
  contentReports: { total: number; rows: ReportAgainstAuthor[] };
  /** What the console did to those contents: the latest ones, and how many in all. */
  contentGestures: { total: number; rows: AuditRow[] };
  /** The contents list narrowed to what this account wrote (authorContentHref). */
  contentHref: string;
}): React.ReactElement {
  const reports = contentReports.rows.map(reportLine);
  const gestures = contentGestures.rows.map(gestureLine);
  return (
    <Card
      title={USER_CARDS.moderation}
      action={
        <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/moderation" className="a-btn a-btn--ghost a-btn--sm">
            File
          </Link>
          <Link href="/moderation/notes" className="a-btn a-btn--ghost a-btn--sm">
            Notes signalées
          </Link>
          <Link href="/moderation/reports" className="a-btn a-btn--ghost a-btn--sm">
            Signalements
          </Link>
          <Link href={contentHref} className="a-btn a-btn--ghost a-btn--sm">
            Ses contenus
          </Link>
        </span>
      }
    >
      <div className="a-card-pad">
        <h3 className="a-subhead" style={{ marginTop: 0 }}>
          {heading("Contenus signalés par le filtre", eventTotal, events.length, "derniers")}
        </h3>
        {events.length === 0 ? (
          <p className="a-field-hint">Rien de signalé.</p>
        ) : (
          <div className="a-table-wrap">
            <table className="a-table">
              <tbody>
                {events.map((event) => {
                  const outcome = OUTCOME[event.outcome];
                  return (
                    <tr key={event.id}>
                      <td>
                        <span className="a-row-link-title">
                          {SURFACE_LABEL[event.surface] ?? event.surface}
                        </span>
                        <div
                          className="a-field-hint"
                          style={{ overflowWrap: "anywhere", maxWidth: 420 }}
                        >
                          {event.excerpt.length > 140
                            ? `${event.excerpt.slice(0, 140)}…`
                            : event.excerpt}
                        </div>
                      </td>
                      <td className="mono a-field-hint">{formatDay(event.createdAt)}</td>
                      <td align="right">
                        <Tag tone={outcome.tone}>{outcome.label}</Tag>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <h3 className="a-subhead">
          {heading("Notes signalées", noteReportTotal, noteReports.length, "dernières")}
        </h3>
        {noteReports.length === 0 ? (
          <p className="a-field-hint">Aucune de ses notes partagées n&apos;a été signalée.</p>
        ) : (
          <div className="a-table-wrap">
            <table className="a-table">
              <tbody>
                {noteReports.map((report) => {
                  const status = REPORT_STATUS[report.status];
                  return (
                    <tr key={report.id}>
                      <td>
                        <span className="a-row-link-title">
                          {NOTE_REPORT_REASON_LABELS[report.reason]}
                        </span>
                        <div className="a-field-hint">Note sur « {report.note.lesson.title} »</div>
                      </td>
                      <td className="mono a-field-hint">{formatDay(report.createdAt)}</td>
                      <td align="right">
                        <Tag tone={status.tone}>{status.label}</Tag>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <h3 className="a-subhead">
          {heading("Contenus publiés, signalés", contentReports.total, reports.length, "derniers")}
        </h3>
        {reports.length === 0 ? (
          <p className="a-field-hint">Aucun de ses contenus publiés n&apos;a été signalé.</p>
        ) : (
          <div className="a-table-wrap">
            <table className="a-table">
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <span className="a-row-link-title">{report.title}</span>
                      <div
                        className="a-field-hint"
                        style={{ overflowWrap: "anywhere", maxWidth: 420 }}
                      >
                        {report.detail ?? "Ce contenu n'existe plus."}
                      </div>
                    </td>
                    <td className="mono a-field-hint">{formatDay(report.at)}</td>
                    <td align="right">
                      <Tag tone={report.status.tone}>{report.status.label}</Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 className="a-subhead">
          {heading(
            "Gestes de la console sur ses contenus",
            contentGestures.total,
            gestures.length,
            "derniers",
          )}
        </h3>
        {gestures.length === 0 ? (
          <p className="a-field-hint">
            Aucun de ses contenus publiés n&apos;a été masqué, réaffiché ni supprimé.
          </p>
        ) : (
          <div className="a-table-wrap">
            <table className="a-table">
              <tbody>
                {gestures.map((line) => (
                  <tr key={line.id}>
                    <td>
                      <span className="a-row-link-title">{line.title}</span>
                      {line.detail !== null && (
                        <div
                          className="a-field-hint"
                          style={{ overflowWrap: "anywhere", maxWidth: 420 }}
                        >
                          {line.detail}
                        </div>
                      )}
                      <div className="a-field-hint">par {line.by}</div>
                    </td>
                    <td className="mono a-field-hint">{formatDay(line.at)}</td>
                    <td align="right">
                      <Tag tone={line.gesture.tone}>{line.gesture.label}</Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
