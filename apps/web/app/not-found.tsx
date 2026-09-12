import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Page introuvable",
};

export default function NotFoundPage(): React.JSX.Element {
  return (
    <main className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />
      <section className={styles.card} aria-labelledby="not-found-title">
        <Link href="/" className={styles.brand} aria-label="CyberLearn · accueil">
          <Image src="/icon_app.png" alt="" width={34} height={34} priority />
          <span>
            cyber<b>learn</b>
          </span>
        </Link>
        <p className={styles.code}>ERR_ROUTE_NOT_FOUND · 404</p>
        <h1 id="not-found-title">Cette page est introuvable.</h1>
        <p className={styles.description}>
          L’adresse est incorrecte, la page a été déplacée ou elle n’existe plus.
        </p>
        <div className={styles.actions}>
          <Link href="/" className={styles.primary}>
            Retour à l’accueil →
          </Link>
          <Link href="/catalogue" className={styles.secondary}>
            Voir les parcours
          </Link>
        </div>
      </section>
    </main>
  );
}
