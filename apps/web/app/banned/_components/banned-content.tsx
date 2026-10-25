import React from "react";
import { StandaloneFrame } from "@/components/standalone-frame";
import { ExportDataButton } from "@/app/(app)/_settings/data/_components/ExportDataButton";
import { BanNotice } from "./ban-notice";
import styles from "../banned.module.css";

const PRIVACY_CONTACT = "privacy@cyberlearn.fr";

export function BannedContent({
  reason,
  endsLabel,
  issuedOn,
  alreadyAcknowledged,
  alreadyAppealed,
}: {
  reason: string;
  endsLabel: string;
  issuedOn: string;
  alreadyAcknowledged: boolean;
  alreadyAppealed: boolean;
}): React.JSX.Element {
  return (
    <StandaloneFrame danger titleId="banned-title">
      <p className={styles.code}>ACCÈS SUSPENDU · 403</p>
      <h1 id="banned-title" className={styles.title}>
        Ton compte est banni.
      </h1>
      <p className={styles.lede}>
        Tu ne peux plus publier ni suivre de leçon pour l&apos;instant. Ta progression, tes notes et
        tes badges sont intacts : rien n&apos;a été supprimé.
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
      <p className={styles.reason}>{reason}</p>

      <BanNotice
        reason={reason}
        endsLabel={endsLabel}
        alreadyAcknowledged={alreadyAcknowledged}
        alreadyAppealed={alreadyAppealed}
      />

      {/* A ban closes the site, not the rights over what it holds (RGPD art.
            15, 17 and 20). The settings that carry them are behind the ban
            gate, so this is their only door: the export route does not look
            at bans, and a deletion goes through privacy@, as /privacy says. */}
      <section className={styles.data} aria-labelledby="banned-data-title">
        <h2 id="banned-data-title" className={styles.dataTitle}>
          Tes données
        </h2>
        <p className={styles.dataText}>
          Le bannissement ne touche pas à tes droits sur tes données. Tu peux en télécharger une
          copie complète, au format JSON, une fois par jour.
        </p>
        <ExportDataButton />
        <p className={styles.dataText}>
          Pour supprimer ton compte, écris à{" "}
          <a href={`mailto:${PRIVACY_CONTACT}`} className={styles.mail}>
            {PRIVACY_CONTACT}
          </a>{" "}
          depuis l&apos;adresse associée à ton compte. La réponse arrive sous un mois au plus.
        </p>
      </section>
    </StandaloneFrame>
  );
}
