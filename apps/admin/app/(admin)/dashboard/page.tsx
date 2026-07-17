import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@cyberlearn/db";
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
  UI,
  type CssWithVars,
  type Tone,
} from "../_components/admin-ui";

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
    openTickets,
    criticalTickets,
    userDates,
    lessonDates,
    certDates,
    ticketDates,
    lessonsByStatus,
    pathCount,
    recentLogs,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: oneWeekAgo } } }),
    prisma.lesson.count({ where: { status: "PUBLISHED" } }),
    prisma.lesson.count({ where: { status: "PUBLISHED", publishedAt: { gte: oneMonthAgo } } }),
    prisma.certificate.count({ where: { revokedAt: null } }),
    prisma.certificate.count({ where: { revokedAt: null, issuedAt: { gte: oneWeekAgo } } }),
    prisma.contactTicket.count({ where: { status: "OPEN" } }),
    prisma.contactTicket.count({ where: { status: "OPEN", theme: { in: ["BUG", "SECURITY"] } } }),
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
    prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { username: true, displayName: true } } },
    }),
    prisma.user.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      select: { id: true, username: true, email: true, role: true, level: true, createdAt: true },
    }),
  ]);

  const statusCount = (status: string): number =>
    lessonsByStatus.find((s) => s.status === status)?._count._all ?? 0;
  const lessonTotal = lessonsByStatus.reduce((sum, s) => sum + s._count._all, 0);

  return (
    <main className="a-page">
      <PageHeader
        eyebrow="Aperçu"
        title="Vue d'ensemble"
        description="Croissance, contenu publié et signalements — l'état de la plateforme sur les 8 dernières semaines."
        actions={
          <>
            <GhostLink href="/lessons/import">Importer MDX</GhostLink>
            <PrimaryLink href="/lessons/new">Nouvelle leçon</PrimaryLink>
          </>
        }
      />

      <div className="a-kpi-grid">
        <KpiCard
          label="Utilisateurs"
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
          label="Leçons publiées"
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
          label="Certificats émis"
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
          label="Tickets ouverts"
          value={openTickets.toLocaleString("fr-FR")}
          series={weeklySeries(
            ticketDates.map((t) => t.createdAt),
            now,
          )}
          delta={
            criticalTickets > 0 ? (
              <>
                <b>
                  {criticalTickets} critique{criticalTickets !== 1 ? "s" : ""}
                </b>{" "}
                à traiter
              </>
            ) : (
              <>aucun critique</>
            )
          }
          tone={criticalTickets > 0 ? "danger" : openTickets > 0 ? "warning" : "accent"}
        />
      </div>

      <div className="a-split">
        <Card title="Activité récente" action={<CardLink href="/audit">Audit log →</CardLink>}>
          {recentLogs.length === 0 ? (
            <p
              style={{
                margin: 0,
                padding: "40px 18px",
                textAlign: "center",
                fontFamily: UI.mono,
                fontSize: 11.5,
                color: UI.muted,
              }}
            >
              Aucune activité récente
            </p>
          ) : (
            <div className="a-feed">
              {recentLogs.map((log) => {
                const actor = log.actor?.username ?? log.actor?.displayName ?? "system";
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
                      <b style={{ color: UI.fg }}>@{actor}</b>{" "}
                      <span style={{ fontFamily: UI.mono, fontSize: 11.5 }}>{log.action}</span>
                      <div className="a-feed-meta">
                        <span style={{ color: UI.turquoise }}>{log.targetType}</span>
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
          <Card title="Nouveaux utilisateurs" action={<CardLink href="/users">Tous →</CardLink>}>
            <div className="a-table-wrap">
              <table className="a-table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Rôle</th>
                    <th style={{ textAlign: "right" }}>Niveau</th>
                    <th style={{ textAlign: "right" }}>Inscrit</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((u) => {
                    const uname = u.username ?? u.email.split("@")[0] ?? "anon";
                    return (
                      <tr key={u.id}>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
                            <Monogram
                              text={uname}
                              size={22}
                              tone={u.role === "ADMIN" ? "accent" : "neutral"}
                            />
                            <span className="mono">@{uname}</span>
                          </span>
                        </td>
                        <td>
                          <Tag tone={u.role === "ADMIN" ? "accent" : "neutral"}>{u.role}</Tag>
                        </td>
                        <td className="num">
                          <span style={{ color: UI.faint }}>LVL·</span>
                          <b style={{ color: UI.turquoise }}>{String(u.level).padStart(2, "0")}</b>
                        </td>
                        <td className="num" style={{ color: UI.muted }}>
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

          <Card title="Contenu" action={<CardLink href="/lessons">Gérer →</CardLink>} pad>
            <div style={{ display: "grid", gap: 16 }}>
              {(
                [
                  { label: "Publiées", value: statusCount("PUBLISHED"), tone: "accent" },
                  { label: "Brouillons", value: statusCount("DRAFT"), tone: "warning" },
                  { label: "Archivées", value: statusCount("ARCHIVED"), tone: "neutral" },
                ] as const
              ).map((row) => (
                <div key={row.label} className="a-meter">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontFamily: UI.mono,
                      fontSize: 10.5,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: UI.muted,
                    }}
                  >
                    <span>{row.label}</span>
                    <b style={{ color: toneColor(row.tone) }}>{row.value}</b>
                  </div>
                  <div className="a-meter-track">
                    <div
                      className="a-meter-fill"
                      style={{
                        width: `${String(lessonTotal > 0 ? Math.round((row.value / lessonTotal) * 100) : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: 4,
                  borderTop: `1px solid ${UI.border}`,
                  fontFamily: UI.mono,
                  fontSize: 10.5,
                  color: UI.muted,
                }}
              >
                <span>
                  <b style={{ color: UI.fg2 }}>{pathCount}</b> parcours publiés
                </span>
                <Link href="/paths" style={{ color: UI.turquoise }}>
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
