import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getRequestUser } from "@/lib/auth";
import styles from "./not-found.module.css";
import "./standalone-page.css";

export const metadata: Metadata = {
  title: "Page introuvable",
};

/**
 * The one 404 of the site: an unknown address, and every notFound() of a
 * lesson or a path, land here.
 *
 * Its ways out depend on who reads it. "Voir les parcours" led a signed-in
 * learner to the public catalogue, a showcase whose every card leads to the
 * sign-up form, which sent them on to the dashboard instead of the path they
 * picked. Signed in, the ways out are the app's.
 */
export default async function NotFoundPage(): Promise<React.JSX.Element> {
  const signedIn = (await getRequestUser()) !== null;

  return (
    <main className="standalone-page">
      <div className="standalone-page__grid" aria-hidden="true" />
      <section className="standalone-page__card" aria-labelledby="not-found-title">
        <Link href="/" className={styles.brand} aria-label="CyberLearn · accueil">
          <Image src="/icon_app.png" alt="" width={34} height={34} priority />
          <span>
            cyber<b>learn</b>
          </span>
        </Link>
        <p className={styles.code}>ERR_ROUTE_NOT_FOUND · 404</p>
        <h1 id="not-found-title" className={styles.title}>
          Cette page est introuvable.
        </h1>
        <p className={styles.description}>
          L’adresse est incorrecte, la page a été déplacée ou elle n’existe plus.
        </p>
        <div className={styles.actions}>
          {signedIn ? (
            <>
              <Link href="/dashboard" className={styles.primary}>
                Retour au tableau de bord →
              </Link>
              <Link href="/paths" className={styles.secondary}>
                Voir les parcours
              </Link>
            </>
          ) : (
            <>
              <Link href="/" className={styles.primary}>
                Retour à l’accueil →
              </Link>
              <Link href="/catalogue" className={styles.secondary}>
                Voir les parcours
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
