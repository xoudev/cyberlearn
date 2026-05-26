import Link from "next/link";
import React from "react";

const MESSAGES: Record<string, { text: string; accent: string }> = {
  missing: { text: "Lien invalide ou expiré.", accent: "#FFB020" },
  invalid: { text: "Lien invalide ou expiré.", accent: "#FFB020" },
  expired: {
    text: "Ce lien de confirmation a expiré. Si vous souhaitez toujours supprimer votre compte, renouvelez la demande depuis vos paramètres.",
    accent: "#FFB020",
  },
  used: { text: "Ce lien a déjà été utilisé.", accent: "#FFB020" },
  internal: {
    text: "Une erreur est survenue lors de la suppression. Contactez privacy@cyberlearn.fr si le problème persiste.",
    accent: "#FF4757",
  },
  auth_cleanup_failed: {
    text: "Vos données ont été supprimées de notre base, mais nous n'avons pas pu finaliser la suppression côté authentification. Notre équipe a été notifiée. Contactez privacy@cyberlearn.fr pour confirmer la clôture complète.",
    accent: "#FF4757",
  },
};

const DEFAULT: { text: string; accent: string } = {
  text: "Une erreur est survenue. Veuillez réessayer ou contacter le support.",
  accent: "#FF4757",
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
        backgroundColor: "#030219",
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
            color: "#6F6B99",
            marginBottom: 24,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "#0AFFD4" }}>$</span>
          <span>~/</span>
          <span style={{ color: "#B8B5D1" }}>cyberlearn</span>
          <span style={{ color: "#44406B" }}>/</span>
          <span>compte</span>
          <span style={{ color: "#44406B" }}>/</span>
          <span>suppression</span>
          <span style={{ color: "#44406B" }}>/</span>
          <span style={{ color: accent }}>échec</span>
        </div>

        {/* Section header */}
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 10,
            letterSpacing: "0.18em",
            color: "#3F3D5C",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {"// ACCOUNT.DELETE.ERROR"}
          <span
            aria-hidden="true"
            style={{ flex: 1, height: 1, background: "#1F1B47", display: "inline-block" }}
          />
        </div>

        {/* Card */}
        <div
          style={{
            position: "relative",
            background: "rgba(5,4,26,0.8)",
            border: "1px solid #1F1B47",
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
              color: "#F5F5FA",
              margin: "0 0 14px",
            }}
          >
            Impossible de confirmer la suppression
          </h1>

          <p style={{ fontSize: 14, color: "#B8B5D1", lineHeight: 1.65, margin: "0 0 24px" }}>
            {text}
          </p>

          {/* Info row */}
          <div
            style={{
              paddingTop: 14,
              borderTop: "1px dashed #1F1B47",
              fontFamily: "monospace",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#3F3D5C",
              marginBottom: 24,
              display: "flex",
              flexWrap: "wrap",
              gap: "4px 10px",
            }}
          >
            <span>Raison</span>
            <b style={{ color: accent, fontWeight: 500 }}>{reason || "unknown"}</b>
            <span style={{ color: "#1F1B47" }}>·</span>
            <span>Contact</span>
            <b style={{ color: "#4D8BFF", fontWeight: 500 }}>privacy@cyberlearn.fr</b>
          </div>

          <Link
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
              background: "transparent",
              border: "1px solid #2A2560",
              color: "#B8B5D1",
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
