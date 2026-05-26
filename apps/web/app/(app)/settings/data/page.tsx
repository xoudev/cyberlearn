import type { Metadata } from "next";
import React from "react";
import { prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { DeleteAccountSection } from "./_components/DeleteAccountSection";

export const metadata: Metadata = {
  title: "Mes données — Cyber Learn",
  description: "Gérez vos données personnelles conformément au RGPD.",
};

function BracketCorners({ color }: { color: string }): React.JSX.Element {
  return (
    <>
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -1,
          left: -1,
          width: 20,
          height: 20,
          borderTop: `2px solid ${color}`,
          borderLeft: `2px solid ${color}`,
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
          borderTop: `2px solid ${color}`,
          borderRight: `2px solid ${color}`,
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
          borderBottom: `2px solid ${color}`,
          borderLeft: `2px solid ${color}`,
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
          borderBottom: `2px solid ${color}`,
          borderRight: `2px solid ${color}`,
        }}
      />
    </>
  );
}

export default async function DataPage(): Promise<React.JSX.Element> {
  const authUser = await requireRequestUser();

  const [activeToken, certificateCount] = await Promise.all([
    prisma.accountDeletionToken.findFirst({
      where: {
        userId: authUser.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: { expiresAt: true },
    }),
    prisma.certificate.count({ where: { userId: authUser.id } }),
  ]);

  return (
    <>
      <div className="page-container">
        <div style={{ maxWidth: 720 }}>
          {/* Breadcrumb */}
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.04em",
              color: "#6F6B99",
              marginBottom: 28,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ color: "#0AFFD4" }}>$</span>
            <span>~/</span>
            <b style={{ color: "#B8B5D1", fontWeight: 500 }}>cyberlearn</b>
            <span style={{ color: "#44406B" }}>/</span>
            <span>paramètres</span>
            <span style={{ color: "#44406B" }}>/</span>
            <span style={{ color: "#F5F5FA", fontWeight: 500 }}>mes-données</span>
            <span
              aria-hidden="true"
              style={{
                display: "inline-block",
                width: 7,
                height: 13,
                background: "#0AFFD4",
                boxShadow: "0 0 8px #0AFFD4",
                marginLeft: 4,
                verticalAlign: "-2px",
                animation: "blink 1s step-end infinite",
              }}
            />
          </div>

          {/* Page header */}
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 30,
              letterSpacing: "-0.02em",
              color: "#F5F5FA",
              margin: "0 0 8px",
            }}
          >
            Mes données
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "#6B6890",
              fontFamily: "var(--font-mono)",
              marginBottom: "32px",
            }}
          >
            Gérez vos données personnelles conformément au RGPD.
          </p>

          {/* Section comment */}
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.18em",
              color: "#3F3D5C",
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {"// DATA.RGPD"}
            <span
              aria-hidden="true"
              style={{ flex: 1, height: 1, background: "#1F1B47", display: "inline-block" }}
            />
          </div>

          {/* Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* ── Export ──────────────────────────────────────────────────────── */}
            <div
              style={{
                position: "relative",
                background: "rgba(5,4,26,0.6)",
                border: "1px solid #1F1B47",
                padding: "18px 20px",
              }}
            >
              <BracketCorners color="#0AFFD4" />

              {/* Eyebrow */}
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#3F3D5C",
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 16,
                    height: 1,
                    background: "#0AFFD4",
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                Portabilité
                <span
                  style={{
                    marginLeft: "auto",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    color: "#0AFFD4",
                    letterSpacing: "0.18em",
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
                      animation: "pulse 2s ease-in-out infinite",
                    }}
                  />
                  ACTIF
                </span>
              </div>

              {/* Title */}
              <h2
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 700,
                  fontSize: 24,
                  letterSpacing: "-0.02em",
                  color: "#F5F5FA",
                  margin: "0 0 10px",
                }}
              >
                Article 20 RGPD
              </h2>

              {/* Description */}
              <p
                style={{
                  fontSize: 14,
                  color: "#B8B5D1",
                  lineHeight: "1.6",
                  margin: "0 0 12px",
                }}
              >
                Conformément à l&apos;article 20 du RGPD (droit à la portabilité), vous pouvez
                télécharger l&apos;ensemble de vos données au format JSON.
              </p>

              {/* Info row */}
              <div
                style={{
                  paddingTop: 12,
                  borderTop: "1px dashed #1F1B47",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#3F3D5C",
                  marginBottom: 18,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "4px 8px",
                }}
              >
                <span>Limite</span>
                <b style={{ color: "#B8B5D1", fontWeight: 500 }}>1/24H</b>
                <span style={{ color: "#1F1B47" }}>·</span>
                <span>Format</span>
                <b style={{ color: "#B8B5D1", fontWeight: 500 }}>JSON</b>
                <span style={{ color: "#1F1B47" }}>·</span>
                <span>Portée</span>
                <b style={{ color: "#B8B5D1", fontWeight: 500 }}>17 modèles</b>
              </div>

              {/* CTA */}
              <a
                href="/api/me/export"
                download
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 20px",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  fontSize: 13,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  background: "transparent",
                  border: "1px solid #0024FF",
                  color: "#F5F5FA",
                  textDecoration: "none",
                }}
              >
                <span style={{ color: "#0AFFD4" }}>&#9656;</span>
                Télécharger l&apos;export
              </a>
            </div>

            {/* ── Suppression — Art. 17 ────────────────────────────────────────── */}
            <DeleteAccountSection
              pendingExpiresAt={activeToken?.expiresAt.toISOString() ?? null}
              certificateCount={certificateCount}
            />
          </div>
        </div>
      </div>
    </>
  );
}
