import Link from "next/link";
import React from "react";

const MESSAGES: Record<string, string> = {
  missing: "Lien invalide ou expiré.",
  invalid: "Lien invalide ou expiré.",
  expired:
    "Ce lien de confirmation a expiré. Si vous souhaitez toujours supprimer votre compte, renouvelez la demande depuis vos paramètres.",
  used: "Ce lien a déjà été utilisé.",
  internal:
    "Une erreur est survenue lors de la suppression. Contactez privacy@cyberlearn.fr si le problème persiste.",
  auth_cleanup_failed:
    "Vos données ont été supprimées de notre base, mais nous n'avons pas pu finaliser la suppression côté authentification. Notre équipe a été notifiée. Contactez privacy@cyberlearn.fr pour confirmer la clôture complète.",
};

const DEFAULT_MESSAGE = "Une erreur est survenue. Veuillez réessayer ou contacter le support.";

export default async function AccountDeleteErrorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.JSX.Element> {
  const params = await searchParams;
  const reason = typeof params.reason === "string" ? params.reason : "";
  const message = MESSAGES[reason] ?? DEFAULT_MESSAGE;

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <div style={styles.iconWrap}>
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFB020"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 style={styles.title}>Impossible de confirmer la suppression</h1>
        <p style={styles.message}>{message}</p>
        <Link href="/" style={styles.link}>
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}

const styles = {
  main: {
    minHeight: "100vh",
    backgroundColor: "#030219",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  } satisfies React.CSSProperties,

  card: {
    backgroundColor: "#0A0826",
    border: "1px solid #1F1B47",
    borderRadius: "12px",
    padding: "48px 40px",
    maxWidth: "480px",
    width: "100%",
    textAlign: "center" as const,
  } satisfies React.CSSProperties,

  iconWrap: {
    marginBottom: "20px",
  } satisfies React.CSSProperties,

  title: {
    fontSize: "20px",
    fontWeight: 600,
    color: "#F5F5FA",
    margin: "0 0 12px",
  } satisfies React.CSSProperties,

  message: {
    fontSize: "14px",
    color: "#B8B5D1",
    lineHeight: 1.65,
    margin: "0 0 28px",
  } satisfies React.CSSProperties,

  link: {
    display: "inline-block",
    fontSize: "13px",
    color: "#4D8BFF",
    textDecoration: "none",
  } satisfies React.CSSProperties,
} as const;
