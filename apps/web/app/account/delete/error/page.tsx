import Link from "next/link";
import React from "react";

const MESSAGES: Record<string, { text: string; accent: string }> = {
  missing: { text: "Lien invalide ou expiré.", accent: "var(--color-warning)" },
  invalid: { text: "Lien invalide ou expiré.", accent: "var(--color-warning)" },
  expired: {
    text: "Ce lien de confirmation a expiré. Si vous souhaitez toujours supprimer votre compte, renouvelez la demande depuis vos paramètres.",
    accent: "var(--color-warning)",
  },
  used: { text: "Ce lien a déjà été utilisé.", accent: "var(--color-warning)" },
  internal: {
    text: "Une erreur est survenue lors de la suppression. Contactez privacy@cyberlearn.fr si le problème persiste.",
    accent: "var(--color-danger)",
  },
  auth_cleanup_failed: {
    text: "Vos données ont été supprimées de notre base, mais nous n'avons pas pu finaliser la suppression côté authentification. Notre équipe a été notifiée. Contactez privacy@cyberlearn.fr pour confirmer la clôture complète.",
    accent: "var(--color-danger)",
  },
};

const DEFAULT: { text: string; accent: string } = {
  text: "Une erreur est survenue. Veuillez réessayer ou contacter le support.",
  accent: "var(--color-danger)",
};

export default async function AccountDeleteErrorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.JSX.Element> {
  const params = await searchParams;
  const reason = typeof params.reason === "string" ? params.reason : "";
  const { text, accent } = MESSAGES[reason] ?? DEFAULT;

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
          <span style={{ color: accent }}>échec</span>
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
          {"// ACCOUNT.DELETE.ERROR"}
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
              borderTop: `2px solid ${accent}`,
              borderLeft: `2px solid ${accent}`,
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
              borderTop: `2px solid ${accent}`,
              borderRight: `2px solid ${accent}`,
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
              borderBottom: `2px solid ${accent}`,
              borderLeft: `2px solid ${accent}`,
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
              borderBottom: `2px solid ${accent}`,
              borderRight: `2px solid ${accent}`,
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
              color: accent,
              border: `1px solid ${accent}40`,
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
                background: accent,
                boxShadow: `0 0 6px ${accent}88`,
              }}
            />
            ÉCHEC
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
            Impossible de confirmer la suppression
          </h1>

          <p
            style={{
              fontSize: 14,
              color: "var(--color-text-secondary)",
              lineHeight: 1.65,
              margin: "0 0 24px",
            }}
          >
            {text}
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
            <span>Raison</span>
            <b style={{ color: accent, fontWeight: 500 }}>{reason || "unknown"}</b>
            <span style={{ color: "var(--color-border-subtle)" }}>·</span>
            <span>Contact</span>
            <b style={{ color: "var(--color-info)", fontWeight: 500 }}>privacy@cyberlearn.fr</b>
          </div>

          <Link
            className="card card--ghost"
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 22px",
              fontFamily: "monospace",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--color-text-secondary)",
              textDecoration: "none",
            }}
          >
            <span>&#9656;</span>
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
