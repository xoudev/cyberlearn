import Image from "next/image";
import Link from "next/link";
import type React from "react";
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
          <Image src="/icon_app.png" alt="" width={30} height={30} priority />
          <span>
            cyber<span className={styles.brandAccent}>learn</span>
          </span>
        </Link>

        <div className={styles.contextCopy}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h1 className={styles.contextTitle}>{contextTitle}</h1>
          <p className={styles.contextText}>{contextText}</p>
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
