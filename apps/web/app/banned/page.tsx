import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { banTimeLeft } from "@cyberlearn/lib";
import { getActiveBan, getRequestUser } from "@/lib/auth";
import { BanNotice } from "./_components/ban-notice";
import styles from "./banned.module.css";

export const metadata: Metadata = { title: "Compte suspendu" };

/**
 * Where a banned account lands, and the only page it can open.
 *
 * It does not call requireRequestUser - that is the gate that sends people
 * here, and calling it from here would be a loop. It reads the ban itself, so
 * the page is also self-correcting: somebody whose ban expired or was lifted
 * while they sat on it is sent back to their dashboard on the next load.
 */
export default async function BannedPage(): Promise<React.JSX.Element> {
  const user = await getRequestUser();
  if (!user) redirect("/login");

  const ban = await getActiveBan();
  // Nothing in force: expired, lifted, or never banned at all.
  if (!ban) redirect("/dashboard");

  const endsLabel = banTimeLeft(ban.expiresAt);
  const issuedOn = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(ban.createdAt);

  return (
    <main className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />
      <section className={styles.card}>
        <p className={styles.code}>ACCÈS SUSPENDU · 403</p>
        <h1 className={styles.title}>Ton compte est banni.</h1>
        <p className={styles.lede}>
          Tu ne peux plus publier ni suivre de leçon pour l&apos;instant. Ta progression, tes notes
          et tes badges sont intacts : rien n&apos;a été supprimé.
        </p>

        <div className={styles.facts}>
          <div className={styles.fact}>
            <span className={styles.factLabel}>Décidé le</span>
            <span className={styles.factValue}>{issuedOn}</span>
          </div>
          <div className={styles.fact}>
            <span className={styles.factLabel}>Durée</span>
            <span className={styles.factValue}>{endsLabel}</span>
          </div>
        </div>

        <p className={styles.label}>Motif</p>
        <p className={styles.reason}>{ban.reason}</p>

        <BanNotice
          reason={ban.reason}
          endsLabel={endsLabel}
          alreadyAcknowledged={ban.acknowledgedAt !== null}
          alreadyAppealed={ban.appealTicketId !== null}
        />
      </section>
    </main>
  );
}
