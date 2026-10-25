import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  awaitsTeamReply,
  compareTicketsForQueue,
  isCriticalTicket,
  isTicketOpen,
  LAST_TICKET_MESSAGE,
  prisma,
} from "@cyberlearn/db";
import { KpiCard, PageHeader, Tag, type Tone } from "../_components/admin-ui";
import { DataGrid, type GridRow } from "../_components/data-grid";
import { TicketStatusSelect } from "./_components/TicketStatusSelect";
import { STATUS_META, THEME_META } from "./ticket-meta";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Tickets" };

/** The facet value of a ticket whose requester wrote last. */
const AWAITING = "AWAITING";

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function AdminTicketsPage(): Promise<React.ReactElement> {
  await requireAdminPage();
  const read = await prisma.contactTicket.findMany({
    select: {
      id: true,
      subject: true,
      theme: true,
      status: true,
      email: true,
      jiraIssueKey: true,
      jiraIssueUrl: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { username: true, displayName: true } },
      messages: LAST_TICKET_MESSAGE,
    },
  });

  // What the team owes first, the most recently touched on top; then the rest
  // by status. See compareTicketsForQueue.
  const tickets = read
    .map((t) => {
      const lastMessageFromStaff = t.messages[0]?.fromStaff ?? null;
      return {
        ...t,
        lastMessageFromStaff,
        awaiting: awaitsTeamReply({ status: t.status, lastMessageFromStaff }),
      };
    })
    .sort(compareTicketsForQueue);

  const openCount = tickets.filter((t) => t.status === "OPEN").length;
  const inProgressCount = tickets.filter((t) => t.status === "IN_PROGRESS").length;
  const awaitingCount = tickets.filter((t) => t.awaiting).length;
  const resolvedCount = tickets.length - openCount - inProgressCount;
  const criticalCount = tickets.filter(isCriticalTicket).length;

  const rows: GridRow[] = tickets.map((t) => {
    const theme = THEME_META[t.theme] ?? { label: t.theme, tone: "neutral" as Tone };
    const isActive = isTicketOpen(t.status);
    const userLabel = t.user?.username
      ? `@${t.user.username}`
      : (t.user?.displayName ?? t.email ?? "anonyme");
    const status = STATUS_META[t.status] ?? { label: t.status, color: "var(--a-muted)" };

    return {
      id: t.id,
      search: `${t.subject} ${userLabel} ${theme.label} ${status.label}`.toLowerCase(),
      facets: [t.status, t.theme, t.awaiting ? AWAITING : ""],
      sort: [
        t.subject.toLowerCase(),
        t.theme,
        userLabel.toLowerCase(),
        0,
        t.createdAt.getTime(),
        t.status,
      ],
      cells: [
        <Link
          key="s"
          href={`/tickets/${t.id}`}
          className="a-row-link"
          style={{ display: "block", maxWidth: 340 }}
        >
          <span
            className="a-row-link-title"
            style={{
              display: "block",
              fontWeight: 600,
              fontSize: 13,
              marginBottom: 3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {t.subject}
          </span>
          <span className="mono" style={{ fontSize: 10, color: "var(--a-muted)" }}>
            {t.id.slice(0, 8)} · lire le message →
          </span>
        </Link>,
        <Tag key="th" tone={isActive ? theme.tone : "neutral"}>
          {theme.label}
        </Tag>,
        <span key="u" className="mono" style={{ color: "var(--a-muted)" }}>
          {userLabel}
        </span>,
        t.jiraIssueKey && t.jiraIssueUrl ? (
          <a
            key="j"
            href={t.jiraIssueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mono"
            style={{ color: "var(--a-info)", fontWeight: 600 }}
          >
            {t.jiraIssueKey} ↗
          </a>
        ) : (
          <span key="j" style={{ color: "var(--a-muted)" }}>
            Aucun
          </span>
        ),
        <span key="d" className="mono" style={{ color: "var(--a-muted)", whiteSpace: "nowrap" }}>
          {formatDate(t.createdAt)}
        </span>,
        isActive ? (
          <span key="st" style={{ display: "inline-grid", gap: 6, justifyItems: "start" }}>
            <TicketStatusSelect ticketId={t.id} currentStatus={t.status} />
            {t.awaiting && <Tag tone="warning">Réponse en attente</Tag>}
          </span>
        ) : (
          <span
            key="st"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-mono)",
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
        crumbs={[{ label: "Support" }]}
        title="Tickets"
        description="Signalements du formulaire de contact. Les bugs et alertes sécurité ouverts ou en cours sont considérés critiques. Un ticket en cours dont le demandeur a répondu remonte en tête, marqué « Réponse en attente »."
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
          delta={
            awaitingCount > 0 ? (
              <>
                dont{" "}
                <b>
                  {awaitingCount} réponse{awaitingCount > 1 ? "s" : ""} en attente
                </b>
              </>
            ) : undefined
          }
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
          {
            label: "Suivi",
            options: [{ value: AWAITING, label: "Réponse en attente" }],
          },
        ]}
        searchPlaceholder="Rechercher un sujet, un utilisateur…"
        emptyTitle="Aucun ticket"
        emptyText="Aucun signalement ne correspond aux filtres actuels."
      />
    </main>
  );
}
