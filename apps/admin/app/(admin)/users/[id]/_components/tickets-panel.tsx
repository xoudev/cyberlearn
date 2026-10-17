import React from "react";
import Link from "next/link";
import type { ticketRepository } from "@cyberlearn/db";
import { Card, Tag } from "../../../_components/admin-ui";
import { STATUS_META, THEME_META } from "../../../tickets/ticket-meta";
import { formatDay } from "../../_components/dates";

type TicketRow = Awaited<ReturnType<typeof ticketRepository.findForUser>>[number];

/**
 * What the account asked the team, most recently touched first. An appeal of
 * a ban is the one kind whose author cannot use the site while it waits, so
 * it is the one marked.
 */
export function TicketsPanel({ tickets }: { tickets: TicketRow[] }): React.ReactElement {
  return (
    <Card
      title={`Tickets · ${String(tickets.length)}`}
      action={
        <Link href="/tickets" className="a-btn a-btn--ghost a-btn--sm">
          File des tickets
        </Link>
      }
    >
      {tickets.length === 0 ? (
        <div className="a-card-pad">
          <p className="a-field-hint">Ce compte n&apos;a ouvert aucun ticket.</p>
        </div>
      ) : (
        <div className="a-table-wrap">
          <table className="a-table">
            <tbody>
              {tickets.map((ticket) => {
                const theme = THEME_META[ticket.theme] ?? { label: ticket.theme, tone: "neutral" };
                const status = STATUS_META[ticket.status] ?? {
                  label: ticket.status,
                  color: "var(--a-muted)",
                };
                return (
                  <tr key={ticket.id}>
                    <td>
                      <Link href={`/tickets/${ticket.id}`} className="a-row-link">
                        <span className="a-row-link-title">{ticket.subject}</span>
                      </Link>
                      <div className="mono a-field-hint">
                        ouvert le {formatDay(ticket.createdAt)} · {ticket._count.messages} réponse
                        {ticket._count.messages > 1 ? "s" : ""}
                      </div>
                    </td>
                    <td>
                      <Tag tone={ticket.theme === "BAN_APPEAL" ? "danger" : theme.tone}>
                        {theme.label}
                      </Tag>
                    </td>
                    <td align="right">
                      <span
                        className="mono"
                        style={{ color: status.color, fontWeight: 700, whiteSpace: "nowrap" }}
                      >
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
