import Link from "next/link";
import type React from "react";
import { BastionLogo } from "@/components/bastion-logo";
import styles from "./auth-shell.module.css";

export function AuthShell({
  eyebrow,
  contextTitle,
  contextText,
  title,
  description,
  children,
}: {
  eyebrow: string;
  contextTitle: string;
  contextText: string;
  title: string;
  description: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <main className={styles.page}>
      <section className={styles.context}>
        <Link className={styles.brand} href="/">
          <BastionLogo size={28} />
          <span>
            CYBER<span className={styles.brandAccent}>LEARN</span>
          </span>
        </Link>

        <div className={styles.contextCopy}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h1 className={styles.contextTitle}>{contextTitle}</h1>
          <p className={styles.contextText}>{contextText}</p>

          <div className={styles.contextTray} aria-hidden="true">
            <div className={styles.contextAxis}>
              <span
                className={styles.contextAxisDot}
                style={{ background: "var(--color-category-cybersec)" }}
              />
              <div>
                <strong>Cybersécurité</strong>
                <span>Labs Web, système & crypto</span>
              </div>
            </div>
            <div className={styles.contextAxis}>
              <span
                className={styles.contextAxisDot}
                style={{ background: "var(--color-category-dev)" }}
              />
              <div>
                <strong>Développement</strong>
                <span>Architecture & code sûr</span>
              </div>
            </div>
            <div className={styles.contextAxis}>
              <span
                className={styles.contextAxisDot}
                style={{ background: "var(--color-category-network)" }}
              />
              <div>
                <strong>Réseaux</strong>
                <span>Protocoles, routage & DNS</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.contextFoot}>
          <span>Session chiffrée</span>
          <span>Mot de passe protégé</span>
          <span>MFA TOTP</span>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.card}>
          <header className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{title}</h2>
            <p className={styles.cardText}>{description}</p>
          </header>
          {children}
        </div>
      </section>
    </main>
  );
}
