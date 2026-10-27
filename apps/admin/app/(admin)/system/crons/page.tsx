import React from "react";
import type { Metadata } from "next";
import { cronRunRepository } from "@cyberlearn/db";
import { CRON_JOBS } from "@cyberlearn/lib/cron/jobs";
import { Card, KpiCard, PageHeader, Tag } from "../../_components/admin-ui";
import { relativeDay } from "../../users/_components/dates";
import {
  CRON_COLUMNS,
  CRON_HEALTH_META,
  CRON_KPI_LABELS,
  CRONS_HEADER,
} from "../_components/crons-head";
import { cronRows, cronTally, formatDuration, summaryText } from "@/lib/cron-status";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Tâches planifiées" };

/** An instant in Paris time, to the minute: "17 oct., 05:30". */
const instant = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Where each scheduled job stands: its last run, read from the audit log
 * where the routes record it, compared with its schedule. A job whose run is
 * due and missing is flagged late; one whose last run failed shows why.
 */
export default async function SystemCronsPage(): Promise<React.ReactElement> {
  await requireAdminPage();
  const now = new Date();
  const runs = await cronRunRepository.latest(CRON_JOBS.map((job) => job.name));
  const rows = cronRows(CRON_JOBS, runs, now);
  const tally = cronTally(rows);

  return (
    <main className="a-page">
      <PageHeader
        crumbs={CRONS_HEADER.crumbs}
        title={CRONS_HEADER.title}
        description={CRONS_HEADER.description}
      />

      <div className="a-kpi-grid">
        <KpiCard label={CRON_KPI_LABELS[0]} value={String(tally.ok)} tone="success" />
        <KpiCard label={CRON_KPI_LABELS[1]} value={String(tally.failed)} tone="danger" />
        <KpiCard label={CRON_KPI_LABELS[2]} value={String(tally.late)} tone="warning" />
        <KpiCard label={CRON_KPI_LABELS[3]} value={String(tally.never)} tone="info" />
      </div>

      <Card>
        <div className="a-table-wrap">
          <table className="a-table">
            <thead>
              <tr>
                {CRON_COLUMNS.map((column) => (
                  <th
                    key={column.label}
                    style={column.align === "right" ? { textAlign: "right" } : undefined}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const health = CRON_HEALTH_META[row.health];
                return (
                  <tr key={row.job.name}>
                    <td style={{ maxWidth: 360, whiteSpace: "normal" }}>
                      <span style={{ display: "grid", gap: 3 }}>
                        <span style={{ fontWeight: 600, color: "var(--a-fg)" }}>
                          {row.job.label}
                        </span>
                        <span className="mono" style={{ color: "var(--a-muted)", fontSize: 11 }}>
                          {row.job.path}
                        </span>
                        <span style={{ color: "var(--a-muted)", fontSize: 12 }}>
                          {row.job.description}
                        </span>
                      </span>
                    </td>
                    <td style={{ whiteSpace: "normal", maxWidth: 220 }}>
                      <span style={{ display: "grid", gap: 4 }}>
                        <span>{row.scheduleText}</span>
                        <span>
                          <Tag tone={row.job.source === "vercel" ? "info" : "neutral"}>
                            {row.job.source === "vercel" ? "Vercel" : "cron-job.org"}
                          </Tag>
                        </span>
                      </span>
                    </td>
                    <td style={{ whiteSpace: "normal", maxWidth: 320 }}>
                      {row.lastRun === null ? (
                        <span style={{ color: "var(--a-faint)" }}>Aucun passage consigné</span>
                      ) : (
                        <span style={{ display: "grid", gap: 3 }}>
                          <span className="mono">
                            {instant.format(row.lastRun.at)} ·{" "}
                            {relativeDay(row.lastRun.at, now.getTime())}
                          </span>
                          <span className="mono" style={{ color: "var(--a-muted)", fontSize: 11 }}>
                            {row.lastRun.durationMs !== null
                              ? formatDuration(row.lastRun.durationMs)
                              : "durée inconnue"}
                            {Object.keys(row.lastRun.summary).length > 0
                              ? ` · ${summaryText(row.job.name, row.lastRun.summary)}`
                              : ""}
                          </span>
                          {!row.lastRun.ok && (
                            <span style={{ color: "var(--a-danger)", fontSize: 12 }}>
                              {row.lastRun.error ?? "Échec sans cause consignée."}
                            </span>
                          )}
                          {row.lastFailure !== null && (
                            <span style={{ color: "var(--a-muted)", fontSize: 12 }}>
                              Dernière erreur le {instant.format(row.lastFailure.at)} :{" "}
                              {row.lastFailure.error ?? "cause non consignée"}
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="mono" style={{ whiteSpace: "nowrap" }}>
                      {row.nextRun !== null ? instant.format(row.nextRun) : "-"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Tag tone={health.tone}>{health.label}</Tag>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
