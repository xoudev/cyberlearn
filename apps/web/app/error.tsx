"use client";

// "use client" justification: an error boundary is a client component, and
// "Réessayer" calls the reset it is handed.

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import styles from "./not-found.module.css";
import "./standalone-page.css";

/**
 * The error page of every route outside the signed-in app: the landing, the
 * public catalogue, a public profile, a certificate's verification page. They
 * had none of their own, so a failure there fell through to global-error,
 * which replaces the whole document. This one keeps the site's layout and
 * looks like the 404, with the (app) boundary's retry and report.
 */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="standalone-page">
      <div className="standalone-page__grid" aria-hidden="true" />
      <section className="standalone-page__card" aria-labelledby="site-error-title">
        <Link href="/" className={styles.brand} aria-label="CyberLearn · accueil">
          <Image src="/icon_app.png" alt="" width={34} height={34} />
          <span>
            cyber<b>learn</b>
          </span>
        </Link>
        <p className={styles.code}>ERR_PAGE_FAILED · 500</p>
        <h1 id="site-error-title" className={styles.title}>
          Cette page n’a pas pu se charger.
        </h1>
        <p className={styles.description}>
          Une erreur est survenue de notre côté. L’incident a été signalé ; tu peux réessayer.
        </p>
        {error.digest ? <p className={styles.digest}>ID : {error.digest}</p> : null}
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={reset}>
            ▸ Réessayer
          </button>
          <Link href="/" className={styles.secondary}>
            Retour à l’accueil
          </Link>
          <Link
            href={`/contact${error.digest ? `?ref=${error.digest}` : ""}`}
            className={styles.secondary}
          >
            Signaler le problème
          </Link>
        </div>
      </section>
    </main>
  );
}
