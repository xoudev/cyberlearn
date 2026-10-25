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
      <section className={styles.context} aria-label="CyberLearn">
        <Link className={styles.brand} href="/" aria-label="CyberLearn · accueil">
          <BastionLogo size={36} />
          <span>
            CYBERLEARN<span className={styles.brandAccent}>.</span>
          </span>
        </Link>
        <div className={styles.contextCopy}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2 className={styles.contextTitle}>{contextTitle}</h2>
          <p className={styles.contextText}>{contextText}</p>
        </div>
        <p className={styles.contextFoot}>Développement / Cybersécurité / Réseaux</p>
      </section>
      <section className={styles.panel} aria-labelledby="auth-title">
        <div className={styles.card}>
          <header className={styles.cardHeader}>
            <h1 id="auth-title" className={styles.cardTitle}>
              {title}
            </h1>
            <p className={styles.cardText}>{description}</p>
          </header>
          {children}
        </div>
      </section>
    </main>
  );
}
