import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { isTicketOpen, ticketRepository } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { ProgressionHeading } from "@/components/progression-heading";
import { BastionLogo } from "@/components/bastion-logo";
import { STATUS_LABEL, STATUS_TONE, THEME_LABEL } from "@/lib/tickets/meta";
import { NewRequestButton } from "./_components/new-request-button";
import "./support.css";

export const metadata: Metadata = { title: "Mes demandes" };
export const dynamic = "force-dynamic";

const dayFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

/**
 * Everything this account has asked the team, and where each one stands.
 *
 * Until now a ticket left through the contact form and was never seen again:
 * the answer arrived by e-mail if it arrived at all, and nothing on the site
 * said a request existed. This is the other half of that form. A new request
 * is written here too, in a window over the list (new-request-dialog.tsx),
 * rather than on the public contact page.
 */
export default async function SupportPage(): Promise<React.ReactElement> {
  const user = await requireRequestUser();
  const tickets = await ticketRepository.findForUser(user.id);

  return (
    <div className="page-container learning-catalogue learning-workspace community-workspace support-workspace">
      <ProgressionHeading
        eyebrow="Aide / Une réponse de l’équipe"
        title="Mes demandes"
        description="Retrouve tes échanges avec l’équipe et suis chaque demande."
      />
      <div className="catalogue-ledger">
        <span>
          <b>{tickets.length}</b> demande{tickets.length > 1 ? "s" : ""}
        </span>
        <span>
          <b>{tickets.filter((ticket) => isTicketOpen(ticket.status)).length}</b> en cours
        </span>
      </div>
      <section className="support-overview" aria-labelledby="support-new">
        <div className="support-overview__body">
          <h2 id="support-new">Un problème à débloquer ?</h2>
          <p>
            Décris ce qui se passe : un bug, une question sur le site ou une erreur dans une leçon.
            Tu retrouveras la réponse ici et par e-mail.
          </p>
          <NewRequestButton className="btn">Nouvelle demande</NewRequestButton>
        </div>
        <aside className="support-overview__aside">
          <BastionLogo size={64} />
          <p>
            Une demande concerne un sujet. Tu peux revenir y ajouter des précisions tant qu’elle est
            ouverte.
          </p>
        </aside>
      </section>

      {tickets.length === 0 ? (
        <p className="cls-empty">
          Tu n’as pas encore de demande. Tes échanges avec l’équipe apparaîtront ici.
        </p>
      ) : (
        <ul className="tk-list">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link href={`/support/${t.id}`} className="tk-row">
                <span className="tk-row__body">
                  <span className="tk-row__subject">{t.subject}</span>
                  <span className="tk-row__meta">
                    {THEME_LABEL[t.theme]} · envoyée le {dayFormat.format(t.createdAt)}
                    {t._count.messages > 0 &&
                      ` · ${String(t._count.messages)} réponse${t._count.messages > 1 ? "s" : ""}`}
                  </span>
                </span>
                <span className="tk-status" data-tone={STATUS_TONE[t.status]}>
                  {STATUS_LABEL[t.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
