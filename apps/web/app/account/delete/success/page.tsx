import Link from "next/link";
import React from "react";

export default function AccountDeleteSuccessPage(): React.JSX.Element {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-bg-base)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ maxWidth: 520, width: "100%" }}>
        {/* Breadcrumb */}
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 12,
            letterSpacing: "0.04em",
            color: "var(--color-text-muted)",
            marginBottom: 24,
            display: "inline-flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "var(--color-brand-turquoise)" }}>$</span>
          <span>~/</span>
          <span style={{ color: "var(--color-text-secondary)" }}>cyberlearn</span>
          <span style={{ color: "var(--color-text-faint)" }}>/</span>
          <span>compte</span>
          <span style={{ color: "var(--color-text-faint)" }}>/</span>
          <span>suppression</span>
          <span style={{ color: "var(--color-text-faint)" }}>/</span>
          <span style={{ color: "var(--color-brand-turquoise)" }}>réussie</span>
        </div>

        {/* Section header */}
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 10,
            letterSpacing: "0.18em",
            color: "var(--color-text-muted)",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {"// ACCOUNT.DELETED"}
          <span
            aria-hidden="true"
            style={{
              flex: 1,
              height: 1,
              background: "var(--color-border-subtle)",
              display: "inline-block",
            }}
          />
        </div>

        {/* Card */}
        <div
          className="card card--sunken"
          style={{
            position: "relative",
            padding: "36px 32px",
          }}
        >
          {/* Bracket corners */}
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -1,
              left: -1,
              width: 20,
              height: 20,
              borderTop: "2px solid var(--color-brand-turquoise)",
              borderLeft: "2px solid var(--color-brand-turquoise)",
            }}
          />
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -1,
              right: -1,
              width: 20,
              height: 20,
              borderTop: "2px solid var(--color-brand-turquoise)",
              borderRight: "2px solid var(--color-brand-turquoise)",
            }}
          />
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: -1,
              left: -1,
              width: 20,
              height: 20,
              borderBottom: "2px solid var(--color-brand-turquoise)",
              borderLeft: "2px solid var(--color-brand-turquoise)",
            }}
          />
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: -1,
              right: -1,
              width: 20,
              height: 20,
              borderBottom: "2px solid var(--color-brand-turquoise)",
              borderRight: "2px solid var(--color-brand-turquoise)",
            }}
          />

          {/* Status badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "monospace",
              fontSize: 10,
              letterSpacing: "0.18em",
              color: "var(--color-brand-turquoise)",
              border: "1px solid rgba(10,255,212,0.25)",
              padding: "4px 10px",
              marginBottom: 20,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "var(--color-brand-turquoise)",
                boxShadow: "0 0 6px var(--color-brand-turquoise)",
              }}
            />
            TERMINÉ
          </div>

          <h1
            style={{
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: "-0.02em",
              color: "var(--color-text-primary)",
              margin: "0 0 14px",
            }}
          >
            Compte supprimé
          </h1>

          <p
            style={{
              fontSize: 14,
              color: "var(--color-text-secondary)",
              lineHeight: 1.65,
              margin: "0 0 10px",
            }}
          >
            Votre compte a été supprimé conformément à votre demande. Merci d&apos;avoir utilisé
            Cyber Learn.
          </p>

          <p
            style={{
              fontSize: 13,
              color: "var(--color-text-muted)",
              lineHeight: 1.55,
              margin: "0 0 24px",
            }}
          >
            Vos certificats restent vérifiables publiquement à leur URL d&apos;origine, mais ne
            portent plus votre nom.
          </p>

          {/* Info row */}
          <div
            style={{
              paddingTop: 14,
              borderTop: "1px dashed var(--color-border-subtle)",
              fontFamily: "monospace",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
              marginBottom: 24,
              display: "flex",
              flexWrap: "wrap",
              gap: "4px 10px",
            }}
          >
            <span>Statut</span>
            <b style={{ color: "var(--color-brand-turquoise)", fontWeight: 500 }}>Anonymisé</b>
            <span style={{ color: "var(--color-border-subtle)" }}>·</span>
            <span>Certifs</span>
            <b style={{ color: "var(--color-brand-turquoise)", fontWeight: 500 }}>Conservés</b>
            <span style={{ color: "var(--color-border-subtle)" }}>·</span>
            <span>Données</span>
            <b style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>Effacées</b>
          </div>

          <Link className="btn" href="/">
            <span>&#9656;</span>
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
