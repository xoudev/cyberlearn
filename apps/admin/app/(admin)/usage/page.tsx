import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { STALLED_AFTER_DAYS, usageRepository } from "@cyberlearn/db";
import { Card, KpiCard, PageHeader } from "../_components/admin-ui";
import type { GridColumn } from "../_components/data-grid";
import {
  COHORT_COLUMNS,
  STALLED_COLUMNS,
  USAGE_CARDS,
  USAGE_HEADER,
  USAGE_KPI_LABELS,
} from "./_components/usage-head";
import { requireAdminPage } from "@/lib/auth";
import {
  activeCounts,
  activityWindowStart,
  cohortsOf,
  cohortWindowStart,
  percent,
  STALLED_MIN_STARTED,
  stalledLessons,
} from "@/lib/usage";

export const metadata: Metadata = { title: "Mesures d'usage" };

/** A cohort's Monday, as a date: "9 nov.". */
const weekDay = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});

function HeadRow({ columns }: { columns: readonly GridColumn[] }): React.ReactElement {
  return (
    <tr>
      {columns.map((column) => (
        <th
          key={column.label}
          style={column.align === "right" ? { textAlign: "right" } : undefined}
        >
          {column.label}
        </th>
      ))}
    </tr>
  );
}

const RIGHT: React.CSSProperties = { textAlign: "right" };
const MUTED: React.CSSProperties = { color: "var(--a-muted)" };

/**
 * What happens on the platform, where the dashboard counts what exists: how
 * many people are active, whether a week's sign-ups come back, and which
 * lessons lose their readers. Read from usageRepository, counted in
 * lib/usage.ts.
 */
export default async function UsagePage(): Promise<React.ReactElement> {
  await requireAdminPage();
  const now = new Date();

  const [totals, activity, signups, funnels] = await Promise.all([
    usageRepository.findAccountTotals(),
    usageRepository.findActivityDaysSince(activityWindowStart(now)),
    usageRepository.findSignupsSince(cohortWindowStart(now)),
    usageRepository.findLessonFunnels(now),
  ]);

  const active = activeCounts(activity, now);
  const cohorts = cohortsOf(signups, now);
  const stalled = stalledLessons(funnels);

  return (
    <main className="a-page">
      <PageHeader
        crumbs={USAGE_HEADER.crumbs}
        title={USAGE_HEADER.title}
        description={USAGE_HEADER.description}
      />

      <div className="a-kpi-grid">
        <KpiCard label={USAGE_KPI_LABELS[0]} value={String(active.today)} tone="success" />
        <KpiCard label={USAGE_KPI_LABELS[1]} value={String(active.last7)} tone="accent" />
        <KpiCard
          label={USAGE_KPI_LABELS[2]}
          value={String(active.last30)}
          series={active.daily}
          delta={`${percent(active.last30, totals.accounts)} des comptes`}
          tone="info"
        />
        <KpiCard
          label={USAGE_KPI_LABELS[3]}
          value={String(totals.accounts)}
          delta={`${percent(totals.onboarded, totals.accounts)} ont terminé leur profil`}
          tone="neutral"
        />
      </div>

      <Card title={USAGE_CARDS.cohorts}>
        <p className="a-card-pad" style={{ ...MUTED, fontSize: 12, margin: 0 }}>
          Les comptes créés chaque semaine, et jusqu’où ils sont allés. « Revenus en 2e semaine » :
          actifs entre leur 7e et leur 13e jour, comptés seulement parmi ceux dont cette semaine est
          écoulée.
        </p>
        <div className="a-table-wrap">
          <table className="a-table">
            <thead>
              <HeadRow columns={COHORT_COLUMNS} />
            </thead>
            <tbody>
              {cohorts.map((cohort) => (
                <tr key={cohort.weekStart}>
                  <td>{weekDay.format(new Date(`${cohort.weekStart}T00:00:00Z`))}</td>
                  <td style={RIGHT}>{cohort.signups}</td>
                  <td style={RIGHT}>
                    {cohort.onboarded}{" "}
                    <span style={MUTED}>({percent(cohort.onboarded, cohort.signups)})</span>
                  </td>
                  <td style={RIGHT}>
                    {cohort.firstLesson}{" "}
                    <span style={MUTED}>({percent(cohort.firstLesson, cohort.signups)})</span>
                  </td>
                  <td style={RIGHT}>
                    {cohort.signups === 0 ? (
                      // A week nobody signed up in has nobody to come back:
                      // "trop tôt" read as if its answer were on its way.
                      <span style={MUTED}>–</span>
                    ) : cohort.eligible === 0 ? (
                      <span style={MUTED}>trop tôt</span>
                    ) : (
                      <>
                        {cohort.returned}/{cohort.eligible}{" "}
                        <span style={MUTED}>({percent(cohort.returned, cohort.eligible)})</span>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title={USAGE_CARDS.lessons}>
        <p className="a-card-pad" style={{ ...MUTED, fontSize: 12, margin: 0 }}>
          Les leçons du catalogue ouvertes par au moins {STALLED_MIN_STARTED} personnes, classées
          par la part de celles qui les ont commencées sans y revenir depuis {STALLED_AFTER_DAYS}{" "}
          jours.
        </p>
        {stalled.length === 0 ? (
          <p className="a-card-pad" style={{ ...MUTED, margin: 0 }}>
            Aucune leçon ne perd encore assez de lecteurs pour figurer ici.
          </p>
        ) : (
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <HeadRow columns={STALLED_COLUMNS} />
              </thead>
              <tbody>
                {stalled.map((lesson) => (
                  <tr key={lesson.id}>
                    <td style={{ maxWidth: 420, whiteSpace: "normal" }}>
                      <span style={{ display: "grid", gap: 3 }}>
                        <Link href={`/lessons/${lesson.id}`} style={{ fontWeight: 600 }}>
                          {lesson.title}
                        </Link>
                        <span className="mono" style={{ ...MUTED, fontSize: 11 }}>
                          {lesson.refCode}
                        </span>
                      </span>
                    </td>
                    <td style={RIGHT}>{lesson.started}</td>
                    <td style={RIGHT}>
                      {lesson.completed}{" "}
                      <span style={MUTED}>({percent(lesson.completed, lesson.started)})</span>
                    </td>
                    <td style={RIGHT}>
                      {lesson.stalled}{" "}
                      <span style={MUTED}>({percent(lesson.stalled, lesson.started)})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  );
}
