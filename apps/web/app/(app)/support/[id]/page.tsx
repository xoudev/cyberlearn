import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isTicketOpen, ticketRepository } from "@cyberlearn/db";
import { TICKET_FOLLOW_UP, ticketConclusion } from "@cyberlearn/lib/tickets/tickets";
import { requireRequestUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { STATUS_LABEL, STATUS_TONE, THEME_LABEL } from "@/lib/tickets/meta";
import { TicketReply } from "../_components/ticket-reply";

export const metadata: Metadata = { title: "Ma demande" };
export const dynamic = "force-dynamic";

const stamp = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" });

/**
 * One ticket, as the person who opened it sees it.
 *
 * findForRequester is scoped to their own id, so a ticket somebody else opened
 * is a 404 rather than a refusal - knowing an id tells the holder nothing about
 * whether it exists.
 */
export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const user = await requireRequestUser();
  const { id } = await params;

  const ticket = await ticketRepository.findForRequester(id, user.id);
  if (!ticket) notFound();

  return (
    <div className="page-container">
      <PageHeader
        crumb="mes-demandes/detail"
        eyebrow={THEME_LABEL[ticket.theme]}
        title={ticket.subject}
      />

      <div className="tk-head">
        <span className="tk-status" data-tone={STATUS_TONE[ticket.status]}>
          {STATUS_LABEL[ticket.status]}
        </span>
        <Link href="/support" className="tle-back">
          Toutes mes demandes
        </Link>
      </div>

      <ol className="tk-thread">
        {/* The ticket's own message opens the thread rather than sitting above
            it: it is the first turn of the conversation, and putting it
            somewhere else makes the reply below it look like it answers
            nothing. */}
        <li className="tk-msg" data-staff="false">
          <span className="tk-msg__who">Toi · {stamp.format(ticket.createdAt)}</span>
          <p className="tk-msg__body">{ticket.message}</p>
        </li>

        {ticket.messages.map((m) => (
          <li key={m.id} className="tk-msg" data-staff={m.fromStaff}>
            <span className="tk-msg__who">
              {m.fromStaff ? (m.author?.displayName ?? "Équipe CyberLearn") : "Toi"} ·{" "}
              {stamp.format(m.createdAt)}
            </span>
            <p className="tk-msg__body">{m.body}</p>
          </li>
        ))}
      </ol>

      {/* Resolved counts as finished, not only closed. The box used to stay up
          on a resolved ticket and the reply was accepted, so an answered
          demand quietly became a second conversation nobody was watching. */}
      {isTicketOpen(ticket.status) ? (
        <TicketReply ticketId={ticket.id} />
      ) : (
        <div className="cls-empty">
          <p style={{ margin: 0 }}>
            {ticketConclusion({
              status: ticket.status,
              closedAt: ticket.updatedAt,
              staffReplied: ticket.messages.some((m) => m.fromStaff),
            })}
          </p>
          <p style={{ margin: "8px 0 0" }}>
            {TICKET_FOLLOW_UP}{" "}
            <Link href="/contact" style={{ color: "var(--cosmetic-accent)" }}>
              Ouvrir une nouvelle demande
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
