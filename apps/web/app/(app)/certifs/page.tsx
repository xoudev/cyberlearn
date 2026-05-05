import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Mes certificats · CyberLearn" };

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

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 56px 120px" }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#6B6890",
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <span style={{ width: 16, height: 1, background: "#0AFFD4", display: "inline-block" }} />
          Mes certificats
        </div>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 30,
            color: "#F5F5FA",
            margin: "0 0 8px",
            letterSpacing: "-0.02em",
          }}
        >
          Certificats délivrés
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#6B6890", margin: 0 }}>
          {String(activeCerts.length)} certificat{activeCerts.length !== 1 ? "s" : ""} actif
          {activeCerts.length !== 1 ? "s" : ""}
          {revokedCerts.length > 0 &&
            ` · ${String(revokedCerts.length)} révoqué${revokedCerts.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {certs.length === 0 ? (
        /* Empty state */
        <div
          style={{
            padding: "80px 40px",
            textAlign: "center",
            border: "1px dashed #2A2560",
            background: "rgba(5,4,26,0.4)",
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            aria-hidden="true"
            style={{ margin: "0 auto 16px", display: "block", opacity: 0.3 }}
          >
            <rect x="6" y="8" width="36" height="32" rx="2" stroke="#2A2560" strokeWidth="1.5" />
            <path
              d="M14 18 H34 M14 24 H28 M14 30 H22"
              stroke="#2A2560"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="36" cy="36" r="8" fill="#0A0826" stroke="#2A2560" strokeWidth="1.5" />
            <path
              d="M33 36 L35 38 L39 34"
              stroke="#2A2560"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              fontSize: 18,
              color: "#F5F5FA",
              margin: "0 0 8px",
            }}
          >
            Aucun certificat pour l&apos;instant
          </p>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "#6B6890",
              margin: "0 0 24px",
              maxWidth: 360,
              marginInline: "auto",
            }}
          >
            Complète un parcours complet pour obtenir ton premier certificat.
          </p>
          <Link
            href="/paths"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 24px",
              background: "#0024FF",
              border: "1px solid #0024FF",
              color: "#fff",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Explorer les parcours →
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {certs.map((cert) => {
            const diff = DIFF_COLORS[cert.path.difficulty] ?? DIFF_DEFAULT;
            const cat = CAT_LABEL[cert.path.category] ?? cert.path.category;
            const issuedAt = new Intl.DateTimeFormat("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            }).format(cert.issuedAt);
            const isRevoked = !!cert.revokedAt;

            return (
              <div
                key={cert.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  padding: "24px 28px",
                  background: isRevoked ? "rgba(5,4,26,0.3)" : "#0A0826",
                  border: `1px solid ${isRevoked ? "#2A2560" : "#1F1B47"}`,
                  opacity: isRevoked ? 0.6 : 1,
                  position: "relative",
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 56,
                    height: 56,
                    background: isRevoked
                      ? "rgba(42,37,96,0.3)"
                      : `linear-gradient(135deg, rgba(0,36,255,0.2), rgba(10,255,212,0.1))`,
                    border: `1px solid ${isRevoked ? "#2A2560" : "rgba(10,255,212,0.2)"}`,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isRevoked ? "#44406B" : "#0AFFD4"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                    <path d="M9 15 L11 17 L15 13" />
                  </svg>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 4,
                      flexWrap: "wrap",
                    }}
                  >
                    <h2
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontWeight: 700,
                        fontSize: 16,
                        color: isRevoked ? "#6B6890" : "#F5F5FA",
                        margin: 0,
                      }}
                    >
                      {cert.path.title}
                    </h2>
                    {isRevoked && (
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                          color: "#FF4757",
                          background: "rgba(255,71,87,0.1)",
                          border: "1px solid rgba(255,71,87,0.3)",
                          padding: "2px 8px",
                        }}
                      >
                        Révoqué
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <span
                      style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6B6890" }}
                    >
                      {cat}
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "2px 8px",
                        background: `${diff.color}14`,
                        border: `1px solid ${diff.color}30`,
                        color: diff.color,
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {diff.label}
                    </span>
                    <span
                      style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6B6890" }}
                    >
                      ~{String(cert.path.estimatedHours)}h
                    </span>
                    <span
                      style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#44406B" }}
                    >
                      Délivré le {issuedAt}
                    </span>
                  </div>
                  {isRevoked && cert.revokedReason && (
                    <p
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "#FF4757",
                        margin: "6px 0 0",
                      }}
                    >
                      Motif : {cert.revokedReason}
                    </p>
                  )}
                </div>

                {/* Actions */}
                {!isRevoked && (
                  <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                    <Link
                      href={`/verify/${cert.publicId}`}
                      style={{
                        padding: "9px 16px",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        fontSize: 10,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        background: "transparent",
                        border: "1px solid #2A2560",
                        color: "#6B6890",
                      }}
                    >
                      Vérifier ↗
                    </Link>
                    <a
                      href={`/api/certificates/${cert.id}/download`}
                      style={{
                        padding: "9px 16px",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        fontSize: 10,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        background: "#0024FF",
                        border: "1px solid #0024FF",
                        color: "#fff",
                        boxShadow: "0 0 16px rgba(0,36,255,0.3)",
                      }}
                    >
                      Télécharger PDF
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
