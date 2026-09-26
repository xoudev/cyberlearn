import Link from "next/link";
import React from "react";

export default function AccountDeleteSuccessPage(): React.JSX.Element {
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
            color: "#7F7BA9",
            marginBottom: 24,
            display: "inline-flex",
            flexWrap: "wrap",
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
          <span style={{ color: "#0AFFD4" }}>réussie</span>
        </div>

        {/* Section header */}
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 10,
            letterSpacing: "0.18em",
            color: "#7F7BA9",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {"// ACCOUNT.DELETED"}
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
              borderTop: "2px solid #0AFFD4",
              borderLeft: "2px solid #0AFFD4",
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
              borderTop: "2px solid #0AFFD4",
              borderRight: "2px solid #0AFFD4",
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
              borderBottom: "2px solid #0AFFD4",
              borderLeft: "2px solid #0AFFD4",
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
              borderBottom: "2px solid #0AFFD4",
              borderRight: "2px solid #0AFFD4",
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
              color: "#0AFFD4",
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
                background: "#0AFFD4",
                boxShadow: "0 0 6px #0AFFD4",
              }}
            />
            TERMINÉ
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
            Compte supprimé
          </h1>

          <p style={{ fontSize: 14, color: "#B8B5D1", lineHeight: 1.65, margin: "0 0 10px" }}>
            Votre compte a été supprimé conformément à votre demande. Merci d&apos;avoir utilisé
            Cyber Learn.
          </p>

          <p style={{ fontSize: 13, color: "#7F7BA9", lineHeight: 1.55, margin: "0 0 24px" }}>
            Vos certificats restent vérifiables publiquement à leur URL d&apos;origine, mais ne
            portent plus votre nom.
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
              color: "#7F7BA9",
              marginBottom: 24,
              display: "flex",
              flexWrap: "wrap",
              gap: "4px 10px",
            }}
          >
            <span>Statut</span>
            <b style={{ color: "#0AFFD4", fontWeight: 500 }}>Anonymisé</b>
            <span style={{ color: "#1F1B47" }}>·</span>
            <span>Certifs</span>
            <b style={{ color: "#0AFFD4", fontWeight: 500 }}>Conservés</b>
            <span style={{ color: "#1F1B47" }}>·</span>
            <span>Données</span>
            <b style={{ color: "#B8B5D1", fontWeight: 500 }}>Effacées</b>
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
              background: "#0024FF",
              color: "#ffffff",
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
