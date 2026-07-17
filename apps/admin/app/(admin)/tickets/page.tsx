import React from "react";
import type { Metadata } from "next";
import { prisma } from "@cyberlearn/db";
import { KpiCard, PageHeader, Tag, UI, type Tone } from "../_components/admin-ui";
import { DataGrid, type GridRow } from "../_components/data-grid";
import { TicketStatusSelect } from "./_components/TicketStatusSelect";

export const metadata: Metadata = { title: "Tickets" };

const THEME_META: Record<string, { label: string; tone: Tone }> = {
  BUG: { label: "Bug", tone: "danger" },
  QUESTION: { label: "Question", tone: "info" },
  FEATURE_REQUEST: { label: "Feature request", tone: "purple" },
  SECURITY: { label: "Sécurité", tone: "danger" },
  CONTENT_ERROR: { label: "Erreur de contenu", tone: "warning" },
  OTHER: { label: "Autre", tone: "neutral" },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Ouvert", color: UI.danger },
  IN_PROGRESS: { label: "En cours", color: UI.warning },
  RESOLVED: { label: "Résolu", color: UI.turquoise },
  CLOSED: { label: "Fermé", color: UI.faint },
};

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function AdminTicketsPage(): Promise<React.ReactElement> {
  const tickets = await prisma.contactTicket.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      subject: true,
      theme: true,
      status: true,
      email: true,
      jiraIssueKey: true,
      jiraIssueUrl: true,
      createdAt: true,
      user: { select: { username: true, displayName: true } },
    },
  });

  const openCount = tickets.filter((t) => t.status === "OPEN").length;
  const inProgressCount = tickets.filter((t) => t.status === "IN_PROGRESS").length;
  const resolvedCount = tickets.length - openCount - inProgressCount;
  const criticalCount = tickets.filter(
    (t) =>
      (t.status === "OPEN" || t.status === "IN_PROGRESS") &&
      (t.theme === "BUG" || t.theme === "SECURITY"),
  ).length;

  const rows: GridRow[] = tickets.map((t) => {
    const theme = THEME_META[t.theme] ?? { label: t.theme, tone: "neutral" as Tone };
    const isActive = t.status === "OPEN" || t.status === "IN_PROGRESS";
    const userLabel = t.user?.username
      ? `@${t.user.username}`
      : (t.user?.displayName ?? t.email ?? "anonyme");
    const status = STATUS_META[t.status] ?? { label: t.status, color: UI.muted };

    return {
      id: t.id,
      search: `${t.subject} ${userLabel} ${theme.label} ${status.label}`.toLowerCase(),
      facets: [t.status, t.theme],
      sort: [
        t.subject.toLowerCase(),
        t.theme,
        userLabel.toLowerCase(),
        0,
        t.createdAt.getTime(),
        t.status,
      ],
      cells: [
        <span key="s" style={{ display: "block", maxWidth: 340 }}>
          <span
            style={{
              display: "block",
              fontWeight: 600,
              color: UI.fg,
              fontSize: 13,
              marginBottom: 3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {t.subject}
          </span>
          <span className="mono" style={{ fontSize: 10, color: UI.faint }}>
            {t.id.slice(0, 8)}
          </span>
        </span>,
        <Tag key="th" tone={isActive ? theme.tone : "neutral"}>
          {theme.label}
        </Tag>,
        <span key="u" className="mono" style={{ color: UI.muted }}>
          {userLabel}
        </span>,
        t.jiraIssueKey && t.jiraIssueUrl ? (
          <a
            key="j"
            href={t.jiraIssueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mono"
            style={{ color: UI.blueSoft, fontWeight: 600 }}
          >
            {t.jiraIssueKey} ↗
          </a>
        ) : (
          <span key="j" style={{ color: UI.faint }}>
            —
          </span>
        ),
        <span key="d" className="mono" style={{ color: UI.muted, whiteSpace: "nowrap" }}>
          {formatDate(t.createdAt)}
        </span>,
        isActive ? (
          <TicketStatusSelect
            key="st"
            ticketId={t.id}
            currentStatus={t.status as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"}
          />
        ) : (
          <span
            key="st"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: UI.mono,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: status.color,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: status.color,
                flexShrink: 0,
              }}
              aria-hidden="true"
            />
            {status.label}
          </span>
        ),
      ],
    };
  });

  return (
    <main className="a-page">
      <PageHeader
        eyebrow="Support"
        title="Tickets"
        description="Signalements du formulaire de contact. Les bugs et alertes sécurité encore ouverts sont considérés critiques."
      />

      <div className="a-kpi-grid">
        <KpiCard
          label="Ouverts"
          value={String(openCount)}
          tone={openCount > 0 ? "danger" : "accent"}
        />
        <KpiCard
          label="En cours"
          value={String(inProgressCount)}
          tone={inProgressCount > 0 ? "warning" : "accent"}
        />
        <KpiCard label="Résolus / fermés" value={String(resolvedCount)} />
        <KpiCard
          label="Critiques actifs"
          value={String(criticalCount)}
          tone={criticalCount > 0 ? "danger" : "accent"}
        />
      </div>

      <DataGrid
        columns={[
          { label: "Sujet", sortable: true },
          { label: "Thème", sortable: true },
          { label: "Utilisateur", sortable: true },
          { label: "Jira" },
          { label: "Date", sortable: true },
          { label: "Statut", sortable: true },
        ]}
        rows={rows}
        facets={[
          {
            label: "Statut",
            options: [
              { value: "OPEN", label: "Ouvert" },
              { value: "IN_PROGRESS", label: "En cours" },
              { value: "RESOLVED", label: "Résolu" },
              { value: "CLOSED", label: "Fermé" },
            ],
          },
          {
            label: "Thème",
            options: Object.entries(THEME_META).map(([value, meta]) => ({
              value,
              label: meta.label,
            })),
          },
        ]}
        searchPlaceholder="Rechercher un sujet, un utilisateur…"
        emptyTitle="Aucun ticket"
        emptyText="Aucun signalement ne correspond aux filtres actuels."
      />
    </main>
  );
}
