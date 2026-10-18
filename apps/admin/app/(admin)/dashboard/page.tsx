import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  CRITICAL_TICKET_WHERE,
  OPEN_TICKET_STATUSES,
  prisma,
  ticketRepository,
  WITHOUT_CRON_RUNS,
} from "@cyberlearn/db";
import { auditActorName } from "@/lib/audit-export";
import { roleLabel, roleTone } from "@/lib/roles";
import { fetchSentryIssues } from "@/lib/sentry-issues";
import { SentryCard } from "../_components/SentryCard";
import {
  Card,
  CardLink,
  GhostLink,
  KpiCard,
  Monogram,
  PageHeader,
  PrimaryLink,
  Tag,
  toneColor,
  type CssWithVars,
  type Tone,
} from "../_components/admin-ui";
import {
  DASHBOARD_CARDS,
  DASHBOARD_HEADER,
  DASHBOARD_KPI_LABELS,
  RECENT_USER_COLUMNS,
} from "./_components/dashboard-head";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Aperçu" };

const WEEKS = 8;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Buckets a list of timestamps into per-week counts over the last N weeks. */
function weeklySeries(dates: Date[], now: number): number[] {
  const series = new Array<number>(WEEKS).fill(0);
  for (const date of dates) {
    const age = now - date.getTime();
    const bucket = WEEKS - 1 - Math.floor(age / WEEK_MS);
    if (bucket >= 0 && bucket < WEEKS) series[bucket] = (series[bucket] ?? 0) + 1;
  }
  return series;
}

const ACTION_TONE: Record<string, Tone> = {
  create: "accent",
  import: "accent",
  publish: "accent",
  update: "warning",
  delete: "danger",
  revoke: "danger",
  login: "info",
};

function actionTone(action: string): Tone {
  for (const [key, tone] of Object.entries(ACTION_TONE)) {
    if (action.includes(key)) return tone;
  }
  return "neutral";
}

function feedStyle(tone: Tone): CssWithVars {
  return { "--feed-tone": toneColor(tone) };
}

function relativeDate(date: Date): string {
  const diff = Date.now() - date.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) {
    return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date);
  }
  if (diff < 2 * day) return "hier";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default async function DashboardPage(): Promise<React.ReactElement> {
  await requireAdminPage();
  const now = Date.now();
  const horizon = new Date(now - WEEKS * WEEK_MS);
  const oneWeekAgo = new Date(now - WEEK_MS);
  const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [
    userCount,
    usersThisWeek,
    lessonCount,
    lessonThisMonth,
    certCount,
    certThisWeek,
    activeTickets,
    openTickets,
    criticalTickets,
    awaitingTickets,
    userDates,
    lessonDates,
    certDates,
    ticketDates,
    lessonsByStatus,
    pathCount,
    recentLogs,
    recentUsers,
    sentry,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: oneWeekAgo } } }),
    prisma.lesson.count({ where: { status: "PUBLISHED" } }),
    prisma.lesson.count({ where: { status: "PUBLISHED", publishedAt: { gte: oneMonthAgo } } }),
    prisma.certificate.count({ where: { revokedAt: null } }),
    prisma.certificate.count({ where: { revokedAt: null, issuedAt: { gte: oneWeekAgo } } }),
    // The card counts what its delta counts within: open or in progress. With
    // OPEN alone, a security report taken in hand read "0" over "1 critique".
    prisma.contactTicket.count({ where: { status: { in: [...OPEN_TICKET_STATUSES] } } }),
    prisma.contactTicket.count({ where: { status: "OPEN" } }),
    // The tickets page's definitions, from the same place: a security report
    // taken in hand is still critical, here as there.
    prisma.contactTicket.count({ where: CRITICAL_TICKET_WHERE }),
    ticketRepository.countAwaitingReply(),
    prisma.user.findMany({
      where: { createdAt: { gte: horizon } },
      select: { createdAt: true },
    }),
    prisma.lesson.findMany({
      where: { publishedAt: { gte: horizon } },
      select: { publishedAt: true },
    }),
    prisma.certificate.findMany({
      where: { issuedAt: { gte: horizon }, revokedAt: null },
      select: { issuedAt: true },
    }),
    prisma.contactTicket.findMany({
      where: { createdAt: { gte: horizon } },
      select: { createdAt: true },
    }),
    prisma.lesson.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.path.count({ where: { status: "PUBLISHED" } }),
    // What people did: the jobs' runs, ten a day, would push it out of the feed.
    prisma.auditLog.findMany({
      where: WITHOUT_CRON_RUNS,
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { username: true, displayName: true, email: true } } },
    }),
    prisma.user.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      select: { id: true, username: true, email: true, role: true, level: true, createdAt: true },
    }),
    // Never fatal: it returns a state rather than throwing, so a Sentry
    // outage cannot take the console's dashboard with it.
    fetchSentryIssues(),
  ]);

  const statusCount = (status: string): number =>
    lessonsByStatus.find((s) => s.status === status)?._count._all ?? 0;
  const lessonTotal = lessonsByStatus.reduce((sum, s) => sum + s._count._all, 0);

  return (
    <main className="a-page">
      <PageHeader
        crumbs={DASHBOARD_HEADER.crumbs}
        title={DASHBOARD_HEADER.title}
        description={DASHBOARD_HEADER.description}
        actions={
          <>
            <GhostLink href="/lessons/import">Importer MDX</GhostLink>
            <PrimaryLink href="/lessons/new">Nouvelle leçon</PrimaryLink>
          </>
        }
      />

      <div className="a-kpi-grid">
        <KpiCard
          label={DASHBOARD_KPI_LABELS[0]}
          value={userCount.toLocaleString("fr-FR")}
          series={weeklySeries(
            userDates.map((u) => u.createdAt),
            now,
          )}
          delta={
            <>
              <b>+{usersThisWeek}</b> cette semaine
            </>
          }
        />
        <KpiCard
          label={DASHBOARD_KPI_LABELS[1]}
          value={lessonCount.toLocaleString("fr-FR")}
          series={weeklySeries(
            lessonDates.map((l) => l.publishedAt).filter((d): d is Date => d !== null),
            now,
          )}
          delta={
            <>
              <b>+{lessonThisMonth}</b> ce mois-ci
            </>
          }
          tone="info"
        />
        <KpiCard
          label={DASHBOARD_KPI_LABELS[2]}
          value={certCount.toLocaleString("fr-FR")}
          series={weeklySeries(
            certDates.map((c) => c.issuedAt),
            now,
          )}
          delta={
            <>
              <b>+{certThisWeek}</b> cette semaine
            </>
          }
          tone="purple"
        />
        <KpiCard
          label={DASHBOARD_KPI_LABELS[3]}
          value={activeTickets.toLocaleString("fr-FR")}
          series={weeklySeries(
            ticketDates.map((t) => t.createdAt),
            now,
          )}
          delta={
            <>
              {criticalTickets > 0 ? (
                <b>
                  {criticalTickets} critique{criticalTickets > 1 ? "s" : ""} actif
                  {criticalTickets > 1 ? "s" : ""}
                </b>
              ) : (
                "aucun critique actif"
              )}
              {awaitingTickets > 0 && (
                <>
                  {" · "}
                  <b>
                    {awaitingTickets} réponse{awaitingTickets > 1 ? "s" : ""} en attente
                  </b>
                </>
              )}
            </>
          }
          tone={
            criticalTickets > 0
              ? "danger"
              : openTickets > 0 || awaitingTickets > 0
                ? "warning"
                : "accent"
          }
        />
      </div>

      {/* Errors before the activity feed: the audit log says what people did,
          and this says what broke. One of the two is urgent. */}
      <Card
        title={DASHBOARD_CARDS.errors}
        action={
          sentry.state === "ok" && sentry.issues.length > 0 ? (
            <span
              style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--a-danger)" }}
            >
              {sentry.issues.length} non résolue{sentry.issues.length > 1 ? "s" : ""}
            </span>
          ) : undefined
        }
      >
        <SentryCard result={sentry} />
      </Card>

      <div className="a-split">
        <Card
          title={DASHBOARD_CARDS.activity}
          action={<CardLink href="/audit">Audit log →</CardLink>}
        >
          {recentLogs.length === 0 ? (
            <p
              style={{
                margin: 0,
                padding: "40px 18px",
                textAlign: "center",
                fontFamily: "var(--font-mono)",
                fontSize: 11.5,
                color: "var(--a-muted)",
              }}
            >
              Aucune activité récente
            </p>
          ) : (
            <div className="a-feed">
              {recentLogs.map((log) => {
                // Named as /audit names it: an erased account is "compte
                // supprimé", not "@system", and a job that ran alone "système".
                const actor = log.actor?.username ? `@${log.actor.username}` : auditActorName(log);
                return (
                  <div
                    key={log.id}
                    className="a-feed-item"
                    style={feedStyle(actionTone(log.action))}
                  >
                    <span className="a-feed-rail">
                      <span className="a-feed-dot" />
                      <span className="a-feed-line" />
                    </span>
                    <div className="a-feed-body">
                      <b style={{ color: "var(--a-fg)" }}>{actor}</b>{" "}
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5 }}>
                        {log.action}
                      </span>
                      <div className="a-feed-meta">
                        <span style={{ color: "var(--a-accent)" }}>{log.targetType}</span>
                        {log.targetId ? ` · ${log.targetId.slice(0, 8)}` : null}
                      </div>
                    </div>
                    <span className="a-feed-time">{relativeDate(log.createdAt)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <Card title={DASHBOARD_CARDS.newUsers} action={<CardLink href="/users">Tous →</CardLink>}>
            <div className="a-table-wrap">
              <table className="a-table">
                <thead>
                  <tr>
                    {RECENT_USER_COLUMNS.map((column) => (
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
                  {recentUsers.map((u) => {
                    const uname = u.username ?? u.email.split("@")[0] ?? "anon";
                    return (
                      <tr key={u.id}>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
                            <Monogram text={uname} size={22} tone={roleTone(u.role)} />
                            <span className="mono">@{uname}</span>
                          </span>
                        </td>
                        <td>
                          <Tag tone={roleTone(u.role)}>{roleLabel(u.role)}</Tag>
                        </td>
                        <td className="num">
                          <span style={{ color: "var(--a-muted)" }}>LVL·</span>
                          <b style={{ color: "var(--a-accent)" }}>
                            {String(u.level).padStart(2, "0")}
                          </b>
                        </td>
                        <td className="num" style={{ color: "var(--a-muted)" }}>
                          {new Intl.DateTimeFormat("fr-FR", {
                            day: "2-digit",
                            month: "short",
                          }).format(u.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card
            title={DASHBOARD_CARDS.content}
            action={<CardLink href="/lessons">Gérer →</CardLink>}
            pad
          >
            <div style={{ display: "grid", gap: 16 }}>
              {(
                [
                  {
                    label: "Publiées",
                    value: statusCount("PUBLISHED"),
                    tone: "accent",
                    href: "/lessons?status=PUBLISHED",
                  },
                  {
                    label: "Brouillons",
                    value: statusCount("DRAFT"),
                    tone: "warning",
                    href: "/lessons?status=DRAFT",
                  },
                  {
                    label: "Archivées",
                    value: statusCount("ARCHIVED"),
                    tone: "neutral",
                    href: "/lessons/archives",
                  },
                ] as const
              ).map((row) => (
                // Each meter opens the lessons behind its number: the list is
                // filtered by its URL, and the archives are a list of their own.
                <Link key={row.label} href={row.href} className="a-meter">
                  <span
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10.5,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--a-muted)",
                    }}
                  >
                    <span>{row.label}</span>
                    <b style={{ color: toneColor(row.tone) }}>{row.value}</b>
                  </span>
                  <span className="a-meter-track">
                    <span
                      className="a-meter-fill"
                      style={{
                        width: `${String(lessonTotal > 0 ? Math.round((row.value / lessonTotal) * 100) : 0)}%`,
                      }}
                    />
                  </span>
                </Link>
              ))}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: 4,
                  borderTop: "1px solid var(--a-border)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10.5,
                  color: "var(--a-muted)",
                }}
              >
                <span>
                  <b style={{ color: "var(--a-fg-2)" }}>{pathCount}</b> parcours publiés
                </span>
                <Link href="/paths" style={{ color: "var(--a-accent)" }}>
                  Voir →
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
