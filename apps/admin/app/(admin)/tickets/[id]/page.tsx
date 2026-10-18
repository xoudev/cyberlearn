import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isTicketOpen, ticketRepository, userRepository } from "@cyberlearn/db";
import { Card, GhostLink, PageHeader, Tag, type Tone } from "../../_components/admin-ui";
import { AppealedBanCard } from "../_components/AppealedBanCard";
import { TicketAssignee } from "../_components/TicketAssignee";
import { TicketNotes } from "../_components/TicketNotes";
import { TicketStatusSelect } from "../_components/TicketStatusSelect";
import { TICKET_CARDS, TICKET_CRUMBS } from "../_components/ticket-columns";
import { TicketThread } from "../_components/TicketThread";
import { describeAppealedBan } from "../appealed-ban";
import { adminName, STATUS_META, THEME_META } from "../ticket-meta";

import { requireAdminPage } from "@/lib/auth";
import { routeIdOrNotFound } from "@/lib/route-id";

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
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--a-muted)",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 12.5,
          color: "var(--a-fg-2)",
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
  const viewer = await requireAdminPage();
  const id = routeIdOrNotFound((await params).id);

  // Through the repository: the account behind the ticket, who has it in hand
  // and the ban it contests come with it; the team's notes are read apart, so
  // no read of the ticket carries them by accident.
  const [ticket, notes, admins] = await Promise.all([
    ticketRepository.findWithThread(id),
    ticketRepository.listNotes(id),
    userRepository.listAdmins(),
  ]);

  if (!ticket) notFound();

  const theme = THEME_META[ticket.theme] ?? { label: ticket.theme, tone: "neutral" as Tone };
  const status = STATUS_META[ticket.status] ?? { label: ticket.status, color: "var(--a-muted)" };
  const requester = ticket.user?.username
    ? `@${ticket.user.username}`
    : (ticket.user?.displayName ?? "Visiteur non connecté");
  const contactEmail = ticket.email ?? ticket.user?.email ?? null;
  const open = isTicketOpen(ticket.status);

  // Formatted here: the server owns the locale, and a Date crossing to a client
  // component renders differently on the two sides of the boundary.
  const stamp = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" });
  const format = (date: Date): string => stamp.format(date);

  // An assignee demoted since keeps their place in the list, named as such,
  // rather than the control falling back to a value it cannot show.
  const assignable = admins.map((admin) => ({ id: admin.id, name: adminName(admin) }));
  if (ticket.assignee !== null && !admins.some((admin) => admin.id === ticket.assignee?.id)) {
    assignable.push({
      id: ticket.assignee.id,
      name: `${adminName(ticket.assignee)} (plus administrateur)`,
    });
  }

  return (
    <main className="a-page">
      <PageHeader
        crumbs={TICKET_CRUMBS}
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
          <Card title={TICKET_CARDS.message}>
            <p
              style={{
                margin: 0,
                padding: 18,
                fontSize: 14,
                lineHeight: 1.75,
                color: "var(--a-fg-2)",
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
              }}
            >
              {ticket.message}
            </p>
          </Card>

          {/* The ban an appeal contests, next to what the person wrote about
              it, and lifted from here. */}
          {ticket.appealFor !== null && (
            <div style={{ marginTop: 18 }}>
              <AppealedBanCard
                ticketId={ticket.id}
                ticketOpen={open}
                ban={describeAppealedBan(ticket.appealFor, new Date(), format)}
              />
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <Card title={TICKET_CARDS.status} pad>
            <div style={{ display: "grid", gap: 13 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <TicketStatusSelect ticketId={ticket.id} currentStatus={ticket.status} />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10.5,
                    color: "var(--a-muted)",
                  }}
                >
                  mis à jour le {formatDateTime(ticket.updatedAt)}
                </span>
              </div>
              <DetailRow label="Assigné à">
                <TicketAssignee
                  ticketId={ticket.id}
                  assigneeId={ticket.assignee?.id ?? null}
                  viewerId={viewer.id}
                  admins={assignable}
                />
              </DetailRow>
            </div>
          </Card>

          <TicketNotes
            ticketId={ticket.id}
            open={open}
            notes={notes.map((note) => ({
              id: note.id,
              body: note.body,
              stamp: format(note.createdAt),
              authorName: note.author?.displayName ?? null,
            }))}
          />

          <Card title={TICKET_CARDS.details} pad>
            <div style={{ display: "grid", gap: 13 }}>
              <DetailRow label="Demandeur">
                {/* The account, one click away: banning, lifting a ban or
                    unblocking a sign-in all happen on its page. */}
                {ticket.user !== null ? (
                  <Link href={`/users/${ticket.user.id}`} style={{ color: "var(--a-accent)" }}>
                    {requester}
                  </Link>
                ) : (
                  requester
                )}
              </DetailRow>
              <DetailRow label="Email">
                {contactEmail ? (
                  <a href={`mailto:${contactEmail}`} style={{ color: "var(--a-accent)" }}>
                    {contactEmail}
                  </a>
                ) : (
                  <span style={{ color: "var(--a-muted)" }}>anonymisé</span>
                )}
              </DetailRow>
              <DetailRow label="Thème">
                <Tag tone={theme.tone}>{theme.label}</Tag>
              </DetailRow>
              <DetailRow label="Statut">
                <span
                  style={{ color: status.color, fontFamily: "var(--font-mono)", fontWeight: 700 }}
                >
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
                    style={{ color: "var(--a-info)", fontWeight: 600 }}
                  >
                    {ticket.jiraIssueKey} ↗
                  </a>
                ) : (
                  <span style={{ color: "var(--a-muted)" }}>Aucun ticket lié</span>
                )}
              </DetailRow>
              <DetailRow label="Créé le">{formatDateTime(ticket.createdAt)}</DetailRow>
              <DetailRow label="Référence">
                <span className="mono" style={{ fontSize: 11, color: "var(--a-muted)" }}>
                  {ticket.id}
                </span>
              </DetailRow>
              {ticket.userAgent ? (
                <DetailRow label="Navigateur">
                  <span className="mono" style={{ fontSize: 10.5, color: "var(--a-muted)" }}>
                    {ticket.userAgent}
                  </span>
                </DetailRow>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      <Card title={TICKET_CARDS.conversation}>
        <TicketThread
          ticketId={ticket.id}
          open={open}
          requesterName={requester}
          openingMessage={ticket.message}
          openingStamp={format(ticket.createdAt)}
          messages={ticket.messages.map((m) => ({
            id: m.id,
            body: m.body,
            fromStaff: m.fromStaff,
            stamp: format(m.createdAt),
            authorName: m.author?.displayName ?? null,
          }))}
        />
      </Card>
    </main>
  );
}
