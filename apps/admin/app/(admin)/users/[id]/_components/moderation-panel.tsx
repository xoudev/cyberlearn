import React from "react";
import Link from "next/link";
import type { moderationRepository, noteReportRepository } from "@cyberlearn/db";
import { NOTE_REPORT_REASON_LABELS } from "@cyberlearn/lib/notes/report-reasons";
import { Card, Tag, type Tone } from "../../../_components/admin-ui";
import { SURFACE_LABEL } from "../../../moderation/surface-labels";
import { formatDay } from "../../_components/dates";

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
 * What the platform flagged in this account's writing, and what recipients
 * reported about the notes it shared. Read only: both are judged in their
 * queues, which this links to.
 */
export function ModerationPanel({
  events,
  noteReports,
}: {
  events: ModerationRow[];
  noteReports: NoteReportRow[];
}): React.ReactElement {
  return (
    <Card
      title="Modération"
      action={
        <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/moderation" className="a-btn a-btn--ghost a-btn--sm">
            File
          </Link>
          <Link href="/moderation/notes" className="a-btn a-btn--ghost a-btn--sm">
            Notes signalées
          </Link>
        </span>
      }
    >
      <div className="a-card-pad">
        <h3 className="a-subhead" style={{ marginTop: 0 }}>
          Contenus signalés par le filtre · {events.length}
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

        <h3 className="a-subhead">Notes signalées · {noteReports.length}</h3>
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
      </div>
    </Card>
  );
}
