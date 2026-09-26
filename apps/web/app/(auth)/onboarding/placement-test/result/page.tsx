import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { SearchParams } from "next/dist/server/request/search-params";
import { PLACEMENT_CATEGORY_LABEL, placementLevelFor } from "@cyberlearn/lib/onboarding/placement";

interface ResultPageProps {
  searchParams: Promise<SearchParams>;
}

const CAT_COLORS: Record<string, string> = {
  DEV: "#6E8BFF",
  CYBERSEC: "#FF4757",
  NETWORK: "#0AFFD4",
};

function ScoreBar({
  label,
  score,
  color,
}: { label: string; score: number; color: string }): React.ReactElement {
  const level = placementLevelFor(score);
  return (
    <div style={{ padding: "20px 24px", borderBottom: "1px solid #2A2560" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 3,
              height: 14,
              background: color,
              boxShadow: `0 0 8px ${color}`,
              flexShrink: 0,
              display: "inline-block",
            }}
            aria-hidden="true"
          />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#F5F5FA",
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color,
              padding: "2px 8px",
              background: `color-mix(in srgb, ${color} 10%, transparent)`,
              border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
            }}
          >
            {level}
          </span>
        </div>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 800,
            fontSize: 28,
            letterSpacing: "-0.03em",
            color: "#F5F5FA",
            lineHeight: 1,
          }}
        >
          {score}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              fontWeight: 500,
              color: "#7F7BA9",
              letterSpacing: 0,
            }}
          >
            %
          </span>
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: "rgba(5,4,26,0.9)",
          border: "1px solid #2A2560",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${String(score)}%`,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            boxShadow: `0 0 12px ${color}88`,
            transition: "width 700ms ease-out",
          }}
        />
      </div>
    </div>
  );
}

export default async function PlacementResultPage({
  searchParams,
}: ResultPageProps): Promise<React.ReactElement> {
  const params = await searchParams;
  const devScore = Math.min(100, Math.max(0, Number(params.dev ?? 0)));
  const cyberSec = Math.min(100, Math.max(0, Number(params.cybersec ?? 0)));
  const network = Math.min(100, Math.max(0, Number(params.network ?? 0)));
  const recPath = typeof params.path === "string" ? params.path : null;

  const scores = [
    { label: PLACEMENT_CATEGORY_LABEL.DEV, score: devScore, color: CAT_COLORS.DEV ?? "#6E8BFF" },
    {
      label: PLACEMENT_CATEGORY_LABEL.CYBERSEC,
      score: cyberSec,
      color: CAT_COLORS.CYBERSEC ?? "#FF4757",
    },
    {
      label: PLACEMENT_CATEGORY_LABEL.NETWORK,
      score: network,
      color: CAT_COLORS.NETWORK ?? "#0AFFD4",
    },
  ];

  const bestDomain = scores.reduce((a, b) => (a.score >= b.score ? a : b));

  return (
    <div
      style={{ background: "#030219", minHeight: "100vh", position: "relative", color: "#F5F5FA" }}
    >
      {/* ── Ambient glows ─────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background: [
            "radial-gradient(ellipse 1100px 600px at 20% 10%, rgba(0,36,255,0.22), transparent 60%)",
            "radial-gradient(ellipse 900px 500px at 85% 80%, rgba(10,255,212,0.08), transparent 65%)",
          ].join(", "),
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage: [
            "linear-gradient(to right, rgba(42,37,96,0.16) 1px, transparent 1px)",
            "linear-gradient(to bottom, rgba(42,37,96,0.16) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "48px 48px",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 0%, black 40%, transparent 85%)",
          maskImage: "radial-gradient(ellipse at center, black 0%, black 40%, transparent 85%)",
        }}
      />

      {/* ── Topbar ──────────────────────────────────────────────────────── */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 44,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "0 32px",
          background: "rgba(3,2,25,0.65)",
          backdropFilter: "blur(20px) saturate(140%)",
          WebkitBackdropFilter: "blur(20px) saturate(140%)",
          borderBottom: "1px solid #2A2560",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#7F7BA9",
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
        <Image
          src="/icon_app.png"
          alt="CyberLearn"
          width={20}
          height={20}
          priority
          style={{ flexShrink: 0 }}
        />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 14,
            color: "#F5F5FA",
            letterSpacing: "-0.01em",
          }}
        >
          cyber<span style={{ color: "#0AFFD4" }}>learn</span>
        </span>
        <span style={{ color: "#44406B" }}>/</span>
        <span>RÉSULTATS · TEST DE PLACEMENT</span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "#0AFFD4",
            letterSpacing: "0.14em",
          }}
        >
          ANALYSE COMPLÈTE
        </span>
      </header>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          paddingTop: 44,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "44px 32px 120px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 640, marginTop: 56 }}>
          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#7F7BA9",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 1,
                  background: "#0AFFD4",
                  boxShadow: "0 0 6px #0AFFD4",
                  display: "inline-block",
                }}
              />
              ANALYSE TERMINÉE
            </div>
            <h1
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 800,
                fontSize: "clamp(40px, 5vw, 64px)",
                lineHeight: 0.95,
                letterSpacing: "-0.04em",
                color: "#F5F5FA",
                margin: 0,
              }}
            >
              Ton profil,{" "}
              <em
                style={{
                  fontStyle: "normal",
                  background: "linear-gradient(135deg, #0024FF 0%, #0AFFD4 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                cartographié.
              </em>
            </h1>
          </div>

          {/* Scores panel */}
          <div
            style={{
              position: "relative",
              background: "rgba(10,8,38,0.85)",
              border: "1px solid #2A2560",
              marginBottom: 24,
              overflow: "hidden",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: -1,
                zIndex: -1,
                background:
                  "linear-gradient(135deg, rgba(10,255,212,0.25), rgba(0,36,255,0.15) 50%, transparent 100%)",
                filter: "blur(16px)",
                opacity: 0.55,
              }}
            />

            {/* Panel header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 24px",
                borderBottom: "1px solid #1F1B47",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#F5F5FA",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ color: "#0AFFD4" }}>›</span> SCORES PAR DOMAINE
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "#7F7BA9",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                POINT FORT ·{" "}
                <b style={{ color: bestDomain.color, fontWeight: 600 }}>
                  {bestDomain.label.split(" ")[0]}
                </b>
              </span>
            </div>

            {scores.map((s) => (
              <ScoreBar key={s.label} {...s} />
            ))}

            {/* Footer note */}
            <div
              style={{
                padding: "14px 24px",
                background: "rgba(5,4,26,0.5)",
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                color: "#7F7BA9",
                letterSpacing: "0.04em",
                borderTop: "1px solid #1F1B47",
              }}
            >
              Les niveaux débutant de tes domaines forts ont été{" "}
              <b style={{ color: "#0AFFD4" }}>débloqués automatiquement</b>.
            </div>
          </div>

          {/* Recommendation */}
          {recPath ? (
            <div
              style={{
                position: "relative",
                padding: "28px 32px",
                background: "rgba(10,8,38,0.85)",
                border: "1px solid rgba(10,255,212,0.3)",
                marginBottom: 24,
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: "linear-gradient(90deg, transparent, #0AFFD4, transparent)",
                  boxShadow: "0 0 12px #0AFFD4",
                }}
                aria-hidden="true"
              />
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#0AFFD4",
                  marginBottom: 14,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontWeight: 700 }}>›</span> PARCOURS RECOMMANDÉ
              </div>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 14,
                  color: "#B8B5D1",
                  lineHeight: 1.6,
                  margin: "0 0 20px",
                  maxWidth: 480,
                }}
              >
                D&apos;après ton profil, ce parcours correspond à ton niveau et tes objectifs. Les
                prérequis débutant et intermédiaire de tes domaines maîtrisés sont déjà validés.
              </p>
              <Link
                href={`/paths/${recPath}`}
                className="btn-teal"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 24px",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  background: "#0AFFD4",
                  color: "#030219",
                  border: "1px solid #0AFFD4",
                  textDecoration: "none",
                  boxShadow: "0 0 24px rgba(10,255,212,0.35)",
                }}
              >
                Voir le parcours
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M3 7 H11 M8 4 L11 7 L8 10"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
          ) : (
            <div
              style={{
                padding: "24px 28px",
                background: "rgba(10,8,38,0.6)",
                border: "1px solid #2A2560",
                marginBottom: 24,
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 14,
                  color: "#B8B5D1",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Tu pars de zéro, c&apos;est le meilleur moment. Explore nos parcours pour choisir
                ton point d&apos;entrée.
              </p>
            </div>
          )}

          {/* CTA */}
          <div style={{ display: "flex", gap: 12 }}>
            <Link
              href="/dashboard"
              className="btn-blue"
              style={{
                flex: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "14px 24px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                background: "#0024FF",
                color: "#fff",
                border: "1px solid #0024FF",
                textDecoration: "none",
                boxShadow: "0 0 24px rgba(0,36,255,0.35), inset 0 0 0 1px rgba(255,255,255,0.1)",
              }}
            >
              Accéder au tableau de bord
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path
                  d="M3 7 H11 M8 4 L11 7 L8 10"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <Link
              href="/lessons"
              className="btn-ghost"
              style={{
                padding: "14px 20px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                background: "transparent",
                color: "#B8B5D1",
                border: "1px solid #2A2560",
                textDecoration: "none",
              }}
            >
              Explorer les leçons
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
