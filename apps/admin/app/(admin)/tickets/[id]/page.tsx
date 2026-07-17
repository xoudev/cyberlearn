import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@cyberlearn/db";
import { Card, GhostLink, PageHeader, Tag, UI, type Tone } from "../../_components/admin-ui";
import { TicketStatusSelect } from "../_components/TicketStatusSelect";
import { STATUS_META, THEME_META } from "../ticket-meta";

export const metadata: Metadata = { title: "Ticket" };

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 14,
      }}
    >
      <span
        style={{
          fontFamily: UI.mono,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: UI.muted,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 12.5,
          color: UI.fg2,
          textAlign: "right",
          overflowWrap: "anywhere",
          minWidth: 0,
        }}
      >
        {children}
      </span>
    </div>
  );
}

export default async function AdminTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;

  const ticket = await prisma.contactTicket.findUnique({
    where: { id },
    select: {
      id: true,
      subject: true,
      theme: true,
      message: true,
      status: true,
      email: true,
      jiraIssueKey: true,
      jiraIssueUrl: true,
      userAgent: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { username: true, displayName: true, email: true } },
    },
  });

  if (!ticket) notFound();

  const theme = THEME_META[ticket.theme] ?? { label: ticket.theme, tone: "neutral" as Tone };
  const status = STATUS_META[ticket.status] ?? { label: ticket.status, color: UI.muted };
  const requester = ticket.user?.username
    ? `@${ticket.user.username}`
    : (ticket.user?.displayName ?? "Visiteur non connecté");
  const contactEmail = ticket.email ?? ticket.user?.email ?? null;

  return (
    <main className="a-page">
      <PageHeader
        eyebrow="Support · Ticket"
        title={ticket.subject}
        description={
          <>
            Reçu le {formatDateTime(ticket.createdAt)} · <Tag tone={theme.tone}>{theme.label}</Tag>
          </>
        }
        actions={<GhostLink href="/tickets">← Tous les tickets</GhostLink>}
      />

      <div className="a-split">
        <div style={{ alignSelf: "start", minWidth: 0 }}>
          <Card title="Message">
            <p
              style={{
                margin: 0,
                padding: 18,
                fontSize: 14,
                lineHeight: 1.75,
                color: UI.fg2,
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
              }}
            >
              {ticket.message}
            </p>
          </Card>
        </div>

        <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <Card title="Statut" pad>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <TicketStatusSelect
                ticketId={ticket.id}
                currentStatus={ticket.status as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"}
              />
              <span
                style={{
                  fontFamily: UI.mono,
                  fontSize: 10.5,
                  color: UI.muted,
                }}
              >
                mis à jour le {formatDateTime(ticket.updatedAt)}
              </span>
            </div>
          </Card>

          <Card title="Détails" pad>
            <div style={{ display: "grid", gap: 13 }}>
              <DetailRow label="Demandeur">{requester}</DetailRow>
              <DetailRow label="Email">
                {contactEmail ? (
                  <a href={`mailto:${contactEmail}`} style={{ color: UI.turquoise }}>
                    {contactEmail}
                  </a>
                ) : (
                  <span style={{ color: UI.faint }}>anonymisé</span>
                )}
              </DetailRow>
              <DetailRow label="Thème">
                <Tag tone={theme.tone}>{theme.label}</Tag>
              </DetailRow>
              <DetailRow label="Statut">
                <span style={{ color: status.color, fontFamily: UI.mono, fontWeight: 700 }}>
                  {status.label}
                </span>
              </DetailRow>
              <DetailRow label="Jira">
                {ticket.jiraIssueKey && ticket.jiraIssueUrl ? (
                  <a
                    href={ticket.jiraIssueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono"
                    style={{ color: UI.blueSoft, fontWeight: 600 }}
                  >
                    {ticket.jiraIssueKey} ↗
                  </a>
                ) : (
                  <span style={{ color: UI.faint }}>—</span>
                )}
              </DetailRow>
              <DetailRow label="Créé le">{formatDateTime(ticket.createdAt)}</DetailRow>
              <DetailRow label="Référence">
                <span className="mono" style={{ fontSize: 11, color: UI.muted }}>
                  {ticket.id}
                </span>
              </DetailRow>
              {ticket.userAgent ? (
                <DetailRow label="Navigateur">
                  <span className="mono" style={{ fontSize: 10.5, color: UI.muted }}>
                    {ticket.userAgent}
                  </span>
                </DetailRow>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
