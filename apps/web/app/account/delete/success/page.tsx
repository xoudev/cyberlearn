import Link from "next/link";
import React from "react";

export default function AccountDeleteSuccessPage(): React.JSX.Element {
  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <div style={styles.iconWrap}>
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0AFFD4"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h1 style={styles.title}>Compte supprimé</h1>
        <p style={styles.message}>
          Votre compte a été supprimé conformément à votre demande. Merci d&apos;avoir utilisé Cyber
          Learn.
        </p>
        <p style={styles.note}>
          Vos certificats restent vérifiables publiquement à leur URL d&apos;origine.
        </p>
        <Link href="/" style={styles.button}>
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
    margin: "0 0 8px",
  } satisfies React.CSSProperties,

  note: {
    fontSize: "12px",
    color: "#6B6890",
    margin: "0 0 28px",
  } satisfies React.CSSProperties,

  button: {
    display: "inline-block",
    backgroundColor: "#0024FF",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    padding: "12px 28px",
    borderRadius: "8px",
    textDecoration: "none",
  } satisfies React.CSSProperties,
} as const;
