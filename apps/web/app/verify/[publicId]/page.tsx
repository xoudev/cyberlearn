import React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@cyberlearn/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: { params: Promise<{ publicId: string }> }): Promise<Metadata> {
  const { publicId } = await params;
  if (!UUID_RE.test(publicId)) return { title: "Certificat introuvable" };
  const cert = await prisma.certificate.findUnique({
    where: { publicId },
    select: {
      path: { select: { title: true } },
      user: { select: { displayName: true } },
      holderName: true,
    },
  });
  if (!cert) return { title: "Certificat introuvable" };
  const holderDisplay = cert.user?.displayName ?? cert.holderName ?? "Certificat";
  return { title: `Certificat · ${holderDisplay} · ${cert.path.title}` };
}

// ── QR placeholder ────────────────────────────────────────────────────────────

function QrPlaceholder({ size = 80 }: { size?: number }) {
  const cells = Array.from({ length: 100 }, (_, i) => {
    const x = i % 10;
    const y = Math.floor(i / 10);
    // SAFETY: deterministic visual pattern — not a real QR code
    const inFinder = (cx: number, cy: number) => x >= cx && x < cx + 3 && y >= cy && y < cy + 3;
    const isFinder = inFinder(0, 0) || inFinder(7, 0) || inFinder(0, 7);
    if (isFinder) {
      const lx = x % 7;
      const ly = y % 7;
      return lx === 0 || lx === 2 || ly === 0 || ly === 2 || (lx === 1 && ly === 1);
    }
    return (x * 7 + y * 11 + x * y * 3) % 5 < 2;
  });

  const cellSize = size / 10;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(10, ${String(cellSize)}px)`,
        gap: 0,
        width: size,
        height: size,
      }}
      aria-hidden="true"
    >
      {cells.map((on, i) => (
        <span
          key={i}
          style={{
            width: cellSize,
            height: cellSize,
            background: on ? "#0AFFD4" : "transparent",
          }}
        />
      ))}
    </div>
  );
}

// ── Corner brackets ───────────────────────────────────────────────────────────

function CornerBrackets({ color = "#0AFFD4", size = 14 }: { color?: string; size?: number }) {
  const s = (pos: "tl" | "tr" | "bl" | "br"): React.CSSProperties => ({
    position: "absolute",
    width: size,
    height: size,
    borderColor: color,
    borderStyle: "solid",
    borderWidth: 0,
    top: pos.startsWith("t") ? -1 : undefined,
    bottom: pos.startsWith("b") ? -1 : undefined,
    left: pos.endsWith("l") ? -1 : undefined,
    right: pos.endsWith("r") ? -1 : undefined,
    borderTopWidth: pos.startsWith("t") ? 2 : 0,
    borderBottomWidth: pos.startsWith("b") ? 2 : 0,
    borderLeftWidth: pos.endsWith("l") ? 2 : 0,
    borderRightWidth: pos.endsWith("r") ? 2 : 0,
  });
  return (
    <>
      {(["tl", "tr", "bl", "br"] as const).map((pos) => (
        <span key={pos} aria-hidden="true" style={s(pos)} />
      ))}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CertVerifyPage({
  params,
}: { params: Promise<{ publicId: string }> }): Promise<React.ReactElement> {
  const { publicId } = await params;

  if (!UUID_RE.test(publicId)) notFound();

  const cert = await prisma.certificate.findUnique({
    where: { publicId },
    include: {
      user: { select: { displayName: true, username: true } },
      path: {
        select: {
          title: true,
          lessons: { select: { lessonId: true } },
        },
      },
    },
  });

  if (!cert) notFound();

  const isRevoked = cert.revokedAt !== null;
  const issuedStr = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(cert.issuedAt);
  const verifiedStr = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
  const revokedStr = cert.revokedAt
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(cert.revokedAt)
    : null;
  const lessonCount = cert.path.lessons.length;
  const hashShort = cert.sha256Hash
    .replace(/(.{16})/g, "$1 · ")
    .trim()
    .slice(0, 79);
  const certCode = `CYL-${String(cert.issuedAt.getFullYear())}-${String(cert.issuedAt.getMonth() + 1).padStart(2, "0")}-${cert.id.slice(0, 4).toUpperCase()}`;
  // Canonical issuer host — same source as the verify URL (no hardcoded .app).
  const issuerHost = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://cyberlearn.fr").replace(
    /^https?:\/\//,
    "",
  );

  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        background: "#030219",
        minHeight: "100vh",
        color: "#F5F5FA",
      }}
    >
      {/* Ambient glows */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          background: [
            "radial-gradient(ellipse 1200px 600px at 50% -10%, rgba(10,255,212,0.08), transparent 60%)",
            "radial-gradient(ellipse 900px 500px at 50% 110%, rgba(0,36,255,0.18), transparent 60%)",
          ].join(", "),
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "linear-gradient(to right, rgba(42,37,96,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(42,37,96,0.18) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 0%, black 40%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 0%, black 40%, transparent 85%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Navbar */}
      <nav
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 60,
          padding: "0 32px",
          borderBottom: "1px solid #1F1B47",
          background: "rgba(3,2,25,0.85)",
          backdropFilter: "blur(24px) saturate(140%)",
          WebkitBackdropFilter: "blur(24px) saturate(140%)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: -1,
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(10,255,212,0.35) 20%, rgba(0,36,255,0.35) 80%, transparent)",
          }}
        />
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: "#F5F5FA",
          }}
        >
          <Image
            src="/icon_app.png"
            alt="CyberLearn"
            width={30}
            height={30}
            style={{ objectFit: "contain" }}
          />
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: "-0.01em",
            }}
          >
            cyber<span style={{ color: "#0AFFD4" }}>learn</span>
          </span>
        </Link>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#6B6890",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#0AFFD4",
              boxShadow: "0 0 6px #0AFFD4",
              display: "inline-block",
            }}
          />
          Vérification publique
        </span>
      </nav>

      {/* Meta bar */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "18px 32px 14px",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "#6B6890",
          letterSpacing: "0.04em",
          borderBottom: "1px solid #1A1640",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span style={{ color: "#0AFFD4" }}>$</span>
        <span>~/</span>
        <span style={{ color: "#B8B5D1" }}>cyberlearn</span>
        <span style={{ color: "#44406B" }}>/</span>
        <span style={{ color: "#B8B5D1" }}>verify</span>
        <span style={{ color: "#44406B" }}>/</span>
        <span style={{ color: "#F5F5FA" }}>{certCode}</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10.5,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          v1 · API public
        </span>
      </div>

      {/* Status banner */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "16px 20px",
          background: isRevoked ? "#FF4757" : "#0AFFD4",
          color: isRevoked ? "#fff" : "#030219",
          overflow: "hidden",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "linear-gradient(to right, rgba(3,2,25,0.08) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            pointerEvents: "none",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 20, position: "relative" }}>
          <div
            style={{
              width: 44,
              height: 44,
              display: "grid",
              placeItems: "center",
              background: isRevoked ? "rgba(255,255,255,0.15)" : "rgba(3,2,25,0.12)",
              border: `1px solid ${isRevoked ? "rgba(255,255,255,0.3)" : "rgba(3,2,25,0.15)"}`,
              flexShrink: 0,
            }}
          >
            {isRevoked ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 6 L18 18 M18 6 L6 18" />
              </svg>
            ) : (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12 L10 17 L19 7" />
              </svg>
            )}
          </div>
          <div>
            <h2
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 800,
                fontSize: 24,
                letterSpacing: "-0.02em",
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              {isRevoked ? "✗ Certificat révoqué" : "✓ Certificat valide"}
            </h2>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                marginTop: 4,
                opacity: 0.8,
                letterSpacing: "0.04em",
              }}
            >
              {isRevoked
                ? "Ce certificat n'est plus valide"
                : "Authenticité confirmée par signature SHA-256"}
            </div>
          </div>
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.06em",
            textAlign: "right",
            position: "relative",
            opacity: 0.9,
          }}
        >
          <b style={{ fontSize: 13 }}>
            {isRevoked ? `Révoqué le ${revokedStr ?? ""}` : `Vérifié le ${verifiedStr}`}
          </b>
          <div style={{ marginTop: 4 }}>{new Date().toISOString().slice(11, 16)} UTC</div>
        </div>
      </div>

      {/* Main content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 820,
          margin: "0 auto",
          padding: "32px 16px 60px",
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
        className="verify-main-content"
      >
        {/* Certificate document */}
        <div
          style={{
            position: "relative",
            background: isRevoked
              ? "rgba(10,8,38,0.7)"
              : "linear-gradient(135deg, rgba(0,36,255,0.06), transparent 60%), rgba(10,8,38,0.7)",
            border: `1px solid ${isRevoked ? "rgba(255,71,87,0.35)" : "rgba(10,255,212,0.35)"}`,
            padding: "32px 36px",
            opacity: isRevoked ? 0.8 : 1,
          }}
        >
          <CornerBrackets color={isRevoked ? "#FF4757" : "#0AFFD4"} />

          {/* Document header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 32,
              paddingBottom: 24,
              borderBottom: "1px solid #1F1B47",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Image
                src="/icon_app.png"
                alt="CyberLearn"
                width={36}
                height={36}
                style={{ objectFit: "contain", flexShrink: 0 }}
              />
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontWeight: 700,
                    fontSize: 15,
                    letterSpacing: "-0.01em",
                    color: "#F5F5FA",
                  }}
                >
                  cyber<span style={{ color: "#0AFFD4" }}>learn</span>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#6B6890",
                    marginTop: 2,
                  }}
                >
                  Certificat de complétion
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9.5,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#6B6890",
                  marginBottom: 4,
                }}
              >
                Certificat N°
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: "0.1em",
                  color: "#0AFFD4",
                }}
              >
                {certCode}
              </div>
            </div>
          </div>

          {/* Document body */}
          <div style={{ marginBottom: 32 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#6B6890",
                marginBottom: 10,
              }}
            >
              {"// Décerné à"}
            </div>
            <h1
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 800,
                fontSize: "clamp(36px, 6vw, 64px)",
                lineHeight: 0.95,
                letterSpacing: "-0.04em",
                color: "#F5F5FA",
                margin: "0 0 8px",
              }}
            >
              {cert.user?.displayName ?? cert.holderName ?? "Utilisateur supprimé"}
            </h1>
            {cert.user?.username != null && (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 14,
                  letterSpacing: "0.06em",
                  color: "#0AFFD4",
                  marginBottom: 28,
                }}
              >
                @{cert.user.username}
              </div>
            )}

            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#6B6890",
                marginBottom: 8,
              }}
            >
              Pour avoir complété le parcours
            </div>
            <h2
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                fontSize: "clamp(20px, 2.5vw, 28px)",
                letterSpacing: "-0.02em",
                color: "#F5F5FA",
                margin: "0 0 28px",
              }}
            >
              {cert.path.title}
            </h2>

            {/* Meta row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 1,
                background: "#1F1B47",
                border: "1px solid #1F1B47",
              }}
              className="verify-meta-grid"
            >
              {[
                { lbl: "Délivré le", val: issuedStr, accent: false },
                {
                  lbl: "Score final",
                  val:
                    cert.score !== null ? (
                      <>
                        {cert.score}
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#6B6890" }}>
                          {" / 100"}
                        </span>
                      </>
                    ) : (
                      "—"
                    ),
                  accent: true,
                },
                {
                  lbl: "Missions",
                  val: `${String(lessonCount)} / ${String(lessonCount)}`,
                  accent: false,
                },
              ].map(({ lbl, val, accent }) => (
                <div key={lbl} style={{ background: "#0A0826", padding: "14px 18px" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "#6B6890",
                      marginBottom: 6,
                    }}
                  >
                    {lbl}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontWeight: 700,
                      fontSize: 20,
                      letterSpacing: "-0.02em",
                      color: accent ? "#0AFFD4" : "#F5F5FA",
                    }}
                  >
                    {val}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Document footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              paddingTop: 24,
              borderTop: "1px solid #1F1B47",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9.5,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#6B6890",
                  marginBottom: 8,
                }}
              >
                Empreinte cryptographique
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  lineHeight: 1.8,
                  color: "#6B6890",
                  letterSpacing: "0.03em",
                }}
              >
                <b style={{ color: "#B8B5D1" }}>SHA-256</b>
                <br />
                <span style={{ color: "#3F3D5C" }}>{hashShort}</span>
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <QrPlaceholder size={80} />
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#3F3D5C",
                  marginTop: 6,
                }}
              >
                Scanner pour vérifier
              </div>
            </div>
          </div>
        </div>

        {/* Revoked reason */}
        {isRevoked && cert.revokedReason && (
          <div
            style={{
              display: "flex",
              gap: 14,
              padding: "16px 18px",
              background: "rgba(255,71,87,0.08)",
              border: "1px solid rgba(255,71,87,0.35)",
              borderLeft: "3px solid #FF4757",
            }}
          >
            <div
              style={{
                display: "grid",
                placeItems: "center",
                width: 24,
                height: 24,
                border: "1px solid rgba(255,71,87,0.4)",
                background: "rgba(255,71,87,0.1)",
                color: "#FF4757",
                flexShrink: 0,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M8 4 V9 M8 11.5 V12" />
              </svg>
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "#B8B5D1",
                lineHeight: 1.6,
                letterSpacing: "0.02em",
              }}
            >
              <b style={{ color: "#F5F5FA" }}>{"// REVOKE.LOG"}</b>
              <br />
              Révoqué le {revokedStr} · Raison :{" "}
              <span style={{ color: "#fff" }}>{cert.revokedReason}</span>.
              <br />
              Ce certificat a été retiré du registre public et ne peut plus être utilisé comme
              preuve de complétion.
            </div>
          </div>
        )}

        {/* Actions */}
        {!isRevoked && (
          <div style={{ display: "flex", gap: 12 }}>
            <a
              href={`/api/certificates/${cert.id}/download`}
              style={{
                flex: "0 0 auto",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 24px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                background: "#0024FF",
                border: "1px solid #0024FF",
                color: "#fff",
                textDecoration: "none",
                boxShadow: "0 0 20px rgba(0,36,255,0.4)",
                transition: "background 180ms ease",
              }}
            >
              Télécharger le PDF
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 2 V11 M4 7 L8 11 L12 7 M3 14 H13" />
              </svg>
            </a>
            <button
              type="button"
              onClick={undefined}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "14px 22px",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                background: "transparent",
                border: "1px solid #1F1B47",
                color: "#B8B5D1",
                cursor: "pointer",
                transition: "border-color 180ms ease, color 180ms ease",
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="4" cy="8" r="2" />
                <circle cx="12" cy="4" r="2" />
                <circle cx="12" cy="12" r="2" />
                <path d="M5.7 7 L10.3 4.6 M5.7 9 L10.3 11.4" />
              </svg>
              Partager
            </button>
          </div>
        )}

        {/* Metadata grid */}
        <div
          className="verify-meta-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 1,
            background: "#1F1B47",
            border: "1px solid #1F1B47",
          }}
        >
          {[
            { lbl: "Plateforme", val: "Cyber Learn" },
            { lbl: "Émetteur", val: issuerHost },
            { lbl: "Algorithme", val: "SHA-256" },
            {
              lbl: "Expiration",
              val: cert.expiresAt
                ? new Intl.DateTimeFormat("fr-FR").format(cert.expiresAt)
                : "Aucune",
            },
          ].map(({ lbl, val }) => (
            <div key={lbl} style={{ background: "#0A0826", padding: "14px 16px" }}>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9.5,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#6B6890",
                  marginBottom: 6,
                }}
              >
                {lbl}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  fontSize: 12,
                  color: "#B8B5D1",
                  letterSpacing: "0.04em",
                }}
              >
                {val}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
