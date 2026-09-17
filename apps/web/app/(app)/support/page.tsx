import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ticketRepository } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { STATUS_LABEL, STATUS_TONE, THEME_LABEL } from "@/lib/tickets/meta";

export const metadata: Metadata = { title: "Mes demandes" };
export const dynamic = "force-dynamic";

const dayFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

/**
 * Everything this account has asked the team, and where each one stands.
 *
 * Until now a ticket left through the contact form and was never seen again:
 * the answer arrived by e-mail if it arrived at all, and nothing on the site
 * said a request existed. This is the other half of that form.
 */
export default async function SupportPage(): Promise<React.ReactElement> {
  const user = await requireRequestUser();
  const tickets = await ticketRepository.findForUser(user.id);

  return (
    <div className="page-container">
      <PageHeader
        crumb="mes-demandes"
        eyebrow={
          <>
            SUPPORT · <b>{tickets.length}</b> DEMANDE{tickets.length > 1 ? "S" : ""}
          </>
        }
        title="Mes demandes"
        lede="Ce que tu as envoyé à l'équipe, et où ça en est. Les réponses arrivent ici et par e-mail."
      />

      <p style={{ marginBottom: 24 }}>
        <Link href="/contact" className="cls-btn cls-btn--link">
          Nouvelle demande
        </Link>
      </p>

      {tickets.length === 0 ? (
        <p className="cls-empty">
          Tu n&apos;as encore rien envoyé. Un bug, une question, une erreur dans une leçon ou une
          demande d&apos;ajout de ton établissement : c&apos;est ici que ça commence.
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
