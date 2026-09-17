import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ticketRepository } from "@cyberlearn/db";
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

      {ticket.status === "CLOSED" ? (
        <p className="cls-empty">
          Cette demande est close. Si le problème revient, ouvre-en une nouvelle depuis{" "}
          <Link href="/contact" style={{ color: "var(--cosmetic-accent)" }}>
            le formulaire de contact
          </Link>
          .
        </p>
      ) : (
        <TicketReply ticketId={ticket.id} />
      )}
    </div>
  );
}
