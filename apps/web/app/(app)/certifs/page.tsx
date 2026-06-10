import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Mes certificats · CyberLearn" };

const GOLD = "#FFB547";

const DIFF_COLORS: Record<string, { color: string; label: string }> = {
  BEGINNER: { color: "#0AFFD4", label: "Débutant" },
  INTERMEDIATE: { color: "#4D8BFF", label: "Intermédiaire" },
  ADVANCED: { color: "#B14DFF", label: "Avancé" },
  EXPERT: { color: "#FFB020", label: "Expert" },
};
const DIFF_DEFAULT = { color: "#6B6890", label: "-" };

const CAT_LABEL: Record<string, string> = {
  DEV: "Développement",
  CYBERSEC: "Cybersécurité",
  NETWORK: "Réseau",
};

// ── Shared bits ───────────────────────────────────────────────────────────────

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

function CornerBrackets({ color }: { color: string }): React.ReactElement {
  return (
    <>
      {(["tl", "tr", "bl", "br"] as const).map((pos) => (
        <span
          key={pos}
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 12,
            height: 12,
            [pos.startsWith("t") ? "top" : "bottom"]: -1,
            [pos.endsWith("l") ? "left" : "right"]: -1,
            borderColor: color,
            borderStyle: "solid",
            borderWidth: 0,
            opacity: 0.7,
            pointerEvents: "none",
            ...(pos === "tl"
              ? { borderTopWidth: 2, borderLeftWidth: 2 }
              : pos === "tr"
                ? { borderTopWidth: 2, borderRightWidth: 2 }
                : pos === "bl"
                  ? { borderBottomWidth: 2, borderLeftWidth: 2 }
                  : { borderBottomWidth: 2, borderRightWidth: 2 }),
          }}
        />
      ))}
    </>
  );
}

/** Gold hexagonal seal — same regular pointy-top geometry as the badge medallion. */
function CertSeal(): React.ReactElement {
  return (
    <svg
      width="30"
      height="34"
      viewBox="0 0 86.6 100"
      aria-hidden="true"
      style={{ filter: `drop-shadow(0 0 8px color-mix(in oklab, ${GOLD} 55%, transparent))` }}
    >
      <polygon
        points="43.3,0 86.6,25 86.6,75 43.3,100 0,75 0,25"
        fill="rgba(255,181,71,0.07)"
        stroke={GOLD}
        strokeWidth="3"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <g
        fill="none"
        stroke={GOLD}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(20.3, 27) scale(2)"
      >
        <circle cx="11.5" cy="9" r="6.5" />
        <path d="M7 14 L5 23 L11.5 19.5 L18 23 L16 14" />
      </g>
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CertificatesPage(): Promise<React.ReactElement> {
  const authUser = await requireRequestUser();

  const certs = await prisma.certificate.findMany({
    where: { userId: authUser.id },
    orderBy: { issuedAt: "desc" },
    include: {
      path: {
        select: {
          title: true,
          slug: true,
          category: true,
          difficulty: true,
          estimatedHours: true,
        },
      },
    },
  });

  const activeCerts = certs.filter((c) => !c.revokedAt);
  const revokedCerts = certs.filter((c) => c.revokedAt);
  const totalHours = activeCerts.reduce((sum, c) => sum + c.path.estimatedHours, 0);
  const isEmpty = certs.length === 0;

  return (
    <div className="page-container">
      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      <div
        style={{
          ...MONO,
          fontSize: 12,
          letterSpacing: "0.04em",
          color: "#6F6B99",
          marginBottom: 26,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ color: "#0AFFD4" }}>$</span>
        <span>~/</span>
        <b style={{ color: "#B8B5D1", fontWeight: 500 }}>cyberlearn</b>
        <span style={{ color: "#44406B" }}>/</span>
        <span style={{ color: "#F5F5FA", fontWeight: 500 }}>certificats</span>
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

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="catalog-header-grid" style={{ marginBottom: 40 }}>
        <div>
          <div
            style={{
              ...MONO,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#6B6890",
              marginBottom: 14,
            }}
          >
            <span style={{ color: "#44406B" }}>{"// "}</span>
            REGISTRE · <b style={{ color: GOLD, fontWeight: 500 }}>SHA-256</b> · VÉRIFIABLE
          </div>
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: "clamp(40px, 5.5vw, 72px)",
              lineHeight: 1,
              letterSpacing: "-0.035em",
              color: "#F5F5FA",
              margin: "0 0 16px",
            }}
          >
            {isEmpty ? (
              <>
                Ton premier{" "}
                <em
                  style={{
                    fontStyle: "normal",
                    background: "linear-gradient(135deg, #0024FF 0%, #0AFFD4 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  certificat
                </em>{" "}
                {"t'attend."}
              </>
            ) : (
              <>
                <em
                  style={{
                    fontStyle: "normal",
                    background: "linear-gradient(135deg, #0024FF 0%, #0AFFD4 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {activeCerts.length} certificat{activeCerts.length !== 1 ? "s" : ""}
                </em>{" "}
                délivré{activeCerts.length !== 1 ? "s" : ""}.
              </>
            )}
          </h1>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 15,
              color: "#B8B5D1",
              margin: 0,
              maxWidth: 520,
              lineHeight: 1.55,
            }}
          >
            Chaque certificat est signé SHA-256, horodaté et vérifiable publiquement. Télécharge le
            PDF officiel ou partage son lien de vérification.
          </p>
        </div>

        {/* Right: telemetry */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}
        >
          <div
            style={{
              display: "flex",
              gap: 18,
              ...MONO,
              fontSize: 11,
              color: "#6F6B99",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              flexWrap: "wrap",
            }}
          >
            <span>
              <b style={{ color: GOLD }}>{activeCerts.length}</b> actif
              {activeCerts.length !== 1 ? "s" : ""}
            </span>
            <span style={{ color: "#44406B" }}>/</span>
            <span>
              <b style={{ color: revokedCerts.length > 0 ? "#FF4757" : "#6F6B99" }}>
                {revokedCerts.length}
              </b>{" "}
              révoqué{revokedCerts.length !== 1 ? "s" : ""}
            </span>
            <span style={{ color: "#44406B" }}>/</span>
            <span>
              <b style={{ color: "#F5F5FA" }}>~{totalHours}h</b> validées
            </span>
          </div>
          <div
            style={{
              width: 320,
              maxWidth: "100%",
              height: 1,
              background: "linear-gradient(90deg, #2A2560, transparent)",
            }}
            aria-hidden="true"
          />
          <div
            style={{
              ...MONO,
              fontSize: 11,
              color: "#6F6B99",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Authentique · signature SHA-256 · QR de vérification
          </div>
        </div>
      </div>

      {isEmpty ? (
        /* ── Empty state ──────────────────────────────────────────────────── */
        <div
          style={{
            padding: "80px 40px",
            textAlign: "center",
            border: "1px dashed #2A2560",
            background: "rgba(5,4,26,0.4)",
            position: "relative",
          }}
        >
          <div
            style={{ display: "flex", justifyContent: "center", marginBottom: 18, opacity: 0.5 }}
          >
            <CertSeal />
          </div>
          <p
            style={{
              ...MONO,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#6B6890",
              margin: "0 0 10px",
            }}
          >
            {"// registre vide"}
          </p>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 20,
              color: "#F5F5FA",
              margin: "0 0 8px",
            }}
          >
            Aucun certificat pour l&apos;instant
          </p>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 14,
              color: "#B8B5D1",
              margin: "0 auto 26px",
              maxWidth: 380,
              lineHeight: 1.55,
            }}
          >
            Complète un parcours entier — toutes les missions, puis l&apos;examen final — pour
            décrocher ton premier certificat vérifiable.
          </p>
          <Link
            href="/paths"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 28px",
              background: "#0024FF",
              border: "1px solid #0024FF",
              color: "#fff",
              ...MONO,
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              textDecoration: "none",
              boxShadow: "0 0 24px rgba(0,36,255,0.35)",
            }}
          >
            Explorer les parcours →
          </Link>
        </div>
      ) : (
        /* ── Certificate cards ────────────────────────────────────────────── */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: 18,
          }}
        >
          {certs.map((cert) => {
            const diff = DIFF_COLORS[cert.path.difficulty] ?? DIFF_DEFAULT;
            const cat = CAT_LABEL[cert.path.category] ?? cert.path.category;
            const issuedAt = new Intl.DateTimeFormat("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            }).format(cert.issuedAt);
            const isRevoked = !!cert.revokedAt;
            const certRef = cert.publicId.slice(0, 8).toUpperCase();
            const hashSnippet = `${cert.sha256Hash.slice(0, 10)}…${cert.sha256Hash.slice(-4)}`;
            const accent = isRevoked ? "#44406B" : GOLD;

            return (
              <article
                key={cert.id}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  background: isRevoked ? "rgba(7,5,32,0.4)" : "rgba(10,8,38,0.5)",
                  border: `1px solid ${
                    isRevoked ? "#1F1B47" : `color-mix(in oklab, ${GOLD} 28%, #1f1b47)`
                  }`,
                  opacity: isRevoked ? 0.65 : 1,
                  overflow: "hidden",
                }}
              >
                {/* Top strip */}
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
                    boxShadow: isRevoked
                      ? "none"
                      : `0 0 12px color-mix(in oklab, ${GOLD} 55%, transparent)`,
                  }}
                />
                {!isRevoked && <CornerBrackets color={GOLD} />}

                <div style={{ padding: "22px 24px 20px", flex: 1 }}>
                  {/* Header row: eyebrow + seal / revoked chip */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 14,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          ...MONO,
                          fontWeight: 700,
                          fontSize: 9.5,
                          letterSpacing: "0.22em",
                          textTransform: "uppercase",
                          color: accent,
                          marginBottom: 8,
                        }}
                      >
                        — CERTIFIÉ
                      </div>
                      <div
                        style={{
                          ...MONO,
                          fontSize: 9,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: "#6F6B99",
                        }}
                      >
                        {"// "}
                        <b style={{ color: isRevoked ? "#44406B" : "#B8B5D1" }}>CERT-{certRef}</b>
                      </div>
                    </div>
                    {isRevoked ? (
                      <span
                        style={{
                          ...MONO,
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: "#FF4757",
                          background: "rgba(255,71,87,0.1)",
                          border: "1px solid rgba(255,71,87,0.3)",
                          padding: "4px 10px",
                          flexShrink: 0,
                        }}
                      >
                        Révoqué
                      </span>
                    ) : (
                      <CertSeal />
                    )}
                  </div>

                  {/* Title */}
                  <h2
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontWeight: 700,
                      fontSize: 21,
                      lineHeight: 1.15,
                      letterSpacing: "-0.015em",
                      color: isRevoked ? "#6B6890" : "#F5F5FA",
                      margin: "0 0 12px",
                    }}
                  >
                    {cert.path.title}
                  </h2>

                  {/* Meta row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                      marginBottom: 16,
                    }}
                  >
                    <span style={{ ...MONO, fontSize: 11, color: "#6B6890" }}>{cat}</span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "2px 8px",
                        background: `color-mix(in oklab, ${diff.color} 8%, transparent)`,
                        border: `1px solid color-mix(in oklab, ${diff.color} 20%, transparent)`,
                        color: diff.color,
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        ...MONO,
                      }}
                    >
                      {diff.label}
                    </span>
                    <span style={{ ...MONO, fontSize: 11, color: "#6B6890" }}>
                      ~{String(cert.path.estimatedHours)}h
                    </span>
                  </div>

                  {/* Authenticity block */}
                  <div
                    style={{
                      borderTop: "1px solid #1A1640",
                      paddingTop: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 7,
                      ...MONO,
                      fontSize: 10.5,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#6F6B99",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <span>Délivré le</span>
                      <b style={{ color: isRevoked ? "#6B6890" : "#F5F5FA", fontWeight: 600 }}>
                        {issuedAt}
                      </b>
                    </div>
                    {cert.score !== null && (
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <span>Score examen</span>
                        <b style={{ color: isRevoked ? "#6B6890" : "#0AFFD4", fontWeight: 600 }}>
                          {cert.score}%
                        </b>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <span>SHA-256</span>
                      <span style={{ color: "#44406B", textTransform: "none" }}>{hashSnippet}</span>
                    </div>
                    {isRevoked && cert.revokedReason && (
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <span style={{ color: "#FF4757" }}>Motif</span>
                        <span style={{ color: "#FF4757", textTransform: "none" }}>
                          {cert.revokedReason}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!isRevoked && (
                  <div style={{ display: "flex", borderTop: "1px solid #1A1640" }}>
                    <Link
                      href={`/verify/${cert.publicId}`}
                      className="link-action"
                      style={{
                        flex: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: "13px 16px",
                        ...MONO,
                        fontWeight: 700,
                        fontSize: 10,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "#B8B5D1",
                        textDecoration: "none",
                        borderRight: "1px solid #1A1640",
                      }}
                    >
                      Vérifier ↗
                    </Link>
                    <a
                      href={`/api/certificates/${cert.id}/download`}
                      style={{
                        flex: 1.3,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: "13px 16px",
                        ...MONO,
                        fontWeight: 700,
                        fontSize: 10,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        background: "#0024FF",
                        color: "#fff",
                        textDecoration: "none",
                        boxShadow: "0 0 16px rgba(0,36,255,0.3)",
                      }}
                    >
                      Télécharger PDF ↓
                    </a>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
