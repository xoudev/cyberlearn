"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { FeaturedPath, LandingStats } from "@cyberlearn/db";
import { VideoModal } from "@/components/video-modal";
import { LandingTerminal } from "./landing-terminal";

// ── Sub-components ─────────────────────────────────────────────────────────────

function PathIcon({ kind }: { kind: "cyber" | "dev" | "net" }) {
  const s: React.SVGProps<SVGSVGElement> = {
    width: 56,
    height: 56,
    viewBox: "0 0 64 64",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  if (kind === "cyber")
    return (
      <svg {...s}>
        <path d="M32 6 L52 14 V32 C52 44 42 52 32 58 C22 52 12 44 12 32 V14 Z" />
        <path d="M24 32 L30 38 L42 24" />
      </svg>
    );
  if (kind === "dev")
    return (
      <svg {...s}>
        <path d="M22 20 L8 32 L22 44" />
        <path d="M42 20 L56 32 L42 44" />
        <path d="M36 14 L28 50" />
      </svg>
    );
  return (
    <svg {...s}>
      <circle cx="32" cy="14" r="4" />
      <circle cx="14" cy="48" r="4" />
      <circle cx="50" cy="48" r="4" />
      <path d="M32 18 L14 44 M32 18 L50 44 M18 48 L46 48" />
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

// "use client" justification: the landing is animation/interaction heavy
// (terminal animation, hover states, decorative canvases). Data fetching
// lives in the RSC page (app/page.tsx), which passes the stats down.
/** Category and difficulty come from the database as enums; the landing's
 *  colour system and French labels are presentation, so they map here. */
const CATEGORY_STYLE = {
  CYBERSEC: { kind: "cyber", tag: "CYBERSEC", color: "#FF4757" },
  DEV: { kind: "dev", tag: "DEV", color: "#6E8BFF" },
  NETWORK: { kind: "net", tag: "RÉSEAU", color: "#0AFFD4" },
} as const;

const DIFFICULTY_LABEL = {
  BEGINNER: "DÉBUTANT",
  INTERMEDIATE: "INTERMÉDIAIRE",
  ADVANCED: "AVANCÉ",
  EXPERT: "EXPERT",
} as const;

export function LandingClient({
  stats,
  featuredPaths,
}: {
  stats: LandingStats;
  featuredPaths: FeaturedPath[];
}): React.ReactElement {
  const [demoOpen, setDemoOpen] = useState(false);
  return (
    <div style={{ background: "#030219", color: "#F5F5FA", position: "relative" }}>
      <VideoModal
        open={demoOpen}
        onClose={() => {
          setDemoOpen(false);
        }}
        src="/videos/launch.mp4"
        poster="/videos/launch-poster.jpg"
        eyebrow="La démo"
        title="CyberLearn en 30 secondes"
        actions={
          <Link
            href="/register"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "13px 22px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              background: "#0024FF",
              border: "1px solid #0024FF",
              color: "#fff",
              textDecoration: "none",
              boxShadow: "0 0 24px rgba(0,36,255,0.4)",
            }}
          >
            Commencer gratuitement →
          </Link>
        }
      />
      {/* Ambient glows */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          background: [
            "radial-gradient(ellipse 1400px 700px at 20% -10%, rgba(0,36,255,0.25), transparent 60%)",
            "radial-gradient(ellipse 1000px 600px at 100% 20%, rgba(10,255,212,0.10), transparent 65%)",
            "radial-gradient(ellipse 800px 500px at 50% 110%, rgba(0,36,255,0.14), transparent 60%)",
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
            "linear-gradient(to right, rgba(42,37,96,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(42,37,96,0.16) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 0%, black 40%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 0%, black 40%, transparent 85%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ── Navbar ────────────────────────────────────────────────────────── */}
        <nav
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            background: "rgba(3,2,25,0.7)",
            backdropFilter: "blur(18px) saturate(140%)",
            WebkitBackdropFilter: "blur(18px) saturate(140%)",
            borderBottom: "1px solid #1A1640",
          }}
          className="landing-nav"
        >
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
              width={32}
              height={32}
              style={{ objectFit: "contain" }}
            />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: "-0.01em",
              }}
            >
              cyber<span style={{ color: "#0AFFD4" }}>learn</span>
            </span>
          </Link>
          <div className="landing-nav-actions">
            <Link href="/download" className="landing-nav-download">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="7" y="3" width="10" height="18" rx="2" />
                <path d="M11 18h2" />
              </svg>
              <span className="landing-nav-download-label">Application</span>
            </Link>
            <Link
              href="/login"
              className="landing-nav-signin"
              style={{
                alignItems: "center",
                padding: "11px 20px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                border: "1px solid #1F1B47",
                background: "transparent",
                color: "#B8B5D1",
                textDecoration: "none",
                transition: "border-color 180ms ease, color 180ms ease",
              }}
            >
              Connexion
            </Link>
            <Link
              href="/register"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 20px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                background: "#0024FF",
                border: "1px solid #0024FF",
                color: "#fff",
                textDecoration: "none",
                boxShadow: "0 0 20px rgba(0,36,255,0.4)",
                transition: "background 180ms ease",
              }}
            >
              <span className="landing-cta-long">Commencer gratuitement</span>
              <span className="landing-cta-short">Commencer</span>
              <svg
                width="11"
                height="11"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 8 H13 M9 4 L13 8 L9 12" />
              </svg>
            </Link>
          </div>
        </nav>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section
          className="landing-hero-grid"
          style={{
            maxWidth: 1320,
            margin: "0 auto",
          }}
        >
          {/* Left */}
          <div>
            {/* Eyebrow */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#6B6890",
                marginBottom: 28,
                padding: "6px 12px",
                border: "1px solid #1F1B47",
                background: "rgba(10,8,38,0.5)",
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
              <span>
                <b style={{ color: "#B8B5D1" }}>Plateforme FR</b> · 100% en ligne · sans
                installation
              </span>
            </div>

            <h1
              aria-label="Maîtrise la cybersécurité, le dev et les réseaux."
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 800,
                fontSize: "clamp(44px, 5.5vw, 80px)",
                lineHeight: 0.95,
                letterSpacing: "-0.04em",
                color: "#F5F5FA",
                margin: "0 0 24px",
              }}
            >
              Maîtrise la{" "}
              <em
                style={{
                  fontStyle: "normal",
                  background: "linear-gradient(135deg, #0024FF 0%, #0AFFD4 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                cybersécurité
              </em>
              , le dev et les réseaux.
            </h1>

            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 17,
                lineHeight: 1.6,
                color: "#B8B5D1",
                margin: "0 0 36px",
                maxWidth: 520,
              }}
            >
              Tu écris et exécutes ton code directement dans le navigateur, tu valides étape par
              étape, et chaque parcours terminé délivre un certificat vérifiable. Rien à installer.
            </p>

            <div className="landing-cta-row" style={{ marginBottom: 32 }}>
              <Link
                href="/register"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "15px 28px",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  background: "#0024FF",
                  border: "1px solid #0024FF",
                  color: "#fff",
                  textDecoration: "none",
                  boxShadow: "0 0 28px rgba(0,36,255,0.45), inset 0 0 0 1px rgba(255,255,255,0.08)",
                  transition: "background 180ms ease, box-shadow 180ms ease",
                }}
              >
                Commencer gratuitement
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
                  <path d="M3 8 H13 M9 4 L13 8 L9 12" />
                </svg>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setDemoOpen(true);
                }}
                className="btn-ghost"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "15px 28px",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  background: "transparent",
                  border: "1px solid #1F1B47",
                  color: "#B8B5D1",
                  cursor: "pointer",
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M4 3 L13 8 L4 13 Z" />
                </svg>
                Voir la démo
              </button>
              <Link
                href="/catalogue"
                className="btn-ghost"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "15px 28px",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  background: "transparent",
                  border: "1px solid #1F1B47",
                  color: "#B8B5D1",
                  textDecoration: "none",
                }}
              >
                Voir les parcours
              </Link>
            </div>
          </div>

          {/* Right: terminal */}
          <LandingTerminal />
        </section>

        {/* ── Stats strip ───────────────────────────────────────────────────── */}
        <div
          style={{
            borderTop: "1px solid #1F1B47",
            borderBottom: "1px solid #1F1B47",
            background: "rgba(10,8,38,0.4)",
          }}
        >
          <div
            style={{
              maxWidth: 1320,
              margin: "0 auto",
              padding: "16px 16px",
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
            className="landing-stats-strip"
          >
            {[
              { num: String(stats.domains), label: "Domaines" },
              { num: String(stats.publishedLessons), label: "Leçons" },
              { num: String(stats.publishedPaths), label: "Parcours" },
              { num: null, label: "Certifications vérifiables" },
            ].map(({ num, label }, i) => (
              <React.Fragment key={label}>
                {i > 0 && (
                  <span
                    style={{
                      width: 1,
                      height: 18,
                      background: "#1F1B47",
                      margin: "0 28px",
                      flexShrink: 0,
                    }}
                  />
                )}
                <span style={{ color: "#6B6890" }}>
                  {num && <b style={{ color: "#F5F5FA", marginRight: 6 }}>{num}</b>}
                  {label}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── Features ──────────────────────────────────────────────────────── */}
        <section style={{ maxWidth: 1320, margin: "0 auto" }} className="landing-section-pad">
          {/* Section header */}
          <div style={{ maxWidth: 720, marginBottom: 64 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "#6B6890",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{ width: 20, height: 1, background: "#0AFFD4", display: "inline-block" }}
              />
              02 · LE SYSTÈME
            </div>
            <h2
              aria-label="Une plateforme pensée pour les hackers en herbe."
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 800,
                fontSize: "clamp(36px, 4.5vw, 60px)",
                lineHeight: 1.0,
                letterSpacing: "-0.035em",
                color: "#F5F5FA",
                margin: "0 0 18px",
              }}
            >
              Une plateforme pensée pour{" "}
              <em
                style={{
                  fontStyle: "normal",
                  background: "linear-gradient(135deg, #0024FF 0%, #0AFFD4 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                les hackers en herbe
              </em>
              .
            </h2>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 16,
                color: "#B8B5D1",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Pas de slides poussiéreuses. Du code, des labs, et un parcours de progression qui rend
              la pratique addictive.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid-3-col">
            {[
              {
                num: "/ 01 ·",
                label: "PRATIQUE",
                title: "Leçons interactives",
                desc: "Code dans un éditeur intégré, exécute dans ton navigateur, valide étape par étape. Aucune installation, aucun compte à configurer.",
                visual: (
                  <div
                    style={{
                      padding: "20px",
                      background: "#05041A",
                      border: "1px solid #1F1B47",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      borderLeft: "3px solid #0AFFD4",
                    }}
                  >
                    {[
                      { num: "01", text: "# nmap quickscan", comment: true },
                      { num: "02", text: "def scan(host):", comment: false },
                      { num: "03", text: "  ports = [22, 80, 443]", comment: false },
                      { num: "04", text: "  return probe(host)", comment: false },
                      { num: "06", text: 'scan("10.0.0.1")', comment: false },
                    ].map(({ num, text, comment }) => (
                      <div key={num} style={{ display: "flex", gap: 16, lineHeight: 1.7 }}>
                        <span style={{ color: "#3F3D5C", minWidth: 20 }}>{num}</span>
                        <span style={{ color: comment ? "#3F3D5C" : "#B8B5D1" }}>{text}</span>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                num: "/ 02 ·",
                label: "PROGRESSION",
                title: "Gamification complète",
                desc: "XP, niveaux, badges hexagonaux, streaks, classement FR. La courbe d'apprentissage devient une courbe de score.",
                visual: (
                  <div
                    style={{ padding: "20px", background: "#05041A", border: "1px solid #1F1B47" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "#6B6890",
                        marginBottom: 8,
                        letterSpacing: "0.08em",
                      }}
                    >
                      <span>LVL · 14 → 15</span>
                      <span>
                        <b style={{ color: "#F5F5FA" }}>2840</b> / 3500 XP
                      </span>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontWeight: 800,
                          fontSize: 32,
                          letterSpacing: "-0.04em",
                          color: "#F5F5FA",
                          lineHeight: 1,
                        }}
                      >
                        14
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: 8,
                          background: "#1F1B47",
                          borderRadius: 999,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: "81%",
                            height: "100%",
                            background: "linear-gradient(90deg, #0024FF, #0AFFD4)",
                            boxShadow: "0 0 12px rgba(10,255,212,0.5)",
                            borderRadius: 999,
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      {(["#FFB547", "#0AFFD4", "#6E8BFF"] as const).map((color) => (
                        <div
                          key={color}
                          style={{
                            width: 44,
                            height: 50,
                            display: "grid",
                            placeItems: "center",
                            background: `${color}1A`,
                            border: `1px solid ${color}55`,
                            clipPath: "polygon(50% 0, 100% 28%, 100% 72%, 50% 100%, 0 72%, 0 28%)",
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              background: color,
                              transform: "rotate(45deg)",
                              display: "block",
                              boxShadow: `0 0 6px ${color}`,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                num: "/ 03 ·",
                label: "PREUVE",
                title: "Certifications signées",
                desc: "Chaque parcours validé délivre un certificat avec son empreinte SHA-256, vérifiable publiquement sur le site. Affichable sur LinkedIn.",
                visual: (
                  <div
                    style={{
                      padding: "20px",
                      background: "#05041A",
                      border: "1px solid #1F1B47",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 9,
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          color: "#0AFFD4",
                          marginBottom: 10,
                        }}
                      >
                        {"// CYL-CERT · VERIFIED"}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontWeight: 700,
                          fontSize: 14,
                          color: "#F5F5FA",
                          marginBottom: 12,
                        }}
                      >
                        Fondamentaux
                        <br />
                        Cybersécurité
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 9,
                          color: "#3F3D5C",
                          lineHeight: 1.8,
                          letterSpacing: "0.04em",
                        }}
                      >
                        SHA-256
                        <br />
                        7f3a9e2c · 4b1d8f6a
                        <br />
                        5e2b0c9d · 3a4f1e8b
                      </div>
                    </div>
                    <div
                      style={{ display: "grid", gridTemplateColumns: "repeat(8, 8px)", gap: 1.5 }}
                    >
                      {Array.from({ length: 64 }, (_, i) => {
                        const x = i % 8;
                        const y = Math.floor(i / 8);
                        // SAFETY: deterministic visual pattern only
                        const on = (x * 3 + y * 5 + x * y) % 3 === 0;
                        return (
                          <span
                            key={i}
                            style={{
                              width: 8,
                              height: 8,
                              background: on ? "#0AFFD4" : "transparent",
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ),
              },
            ].map(({ num, label, title, desc, visual }) => (
              <div
                key={title}
                className="card-lift"
                style={{
                  background: "#0A0826",
                  border: "1px solid #1F1B47",
                  padding: "28px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
                {visual}
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      color: "#6B6890",
                      marginBottom: 10,
                    }}
                  >
                    {num} <b style={{ color: "#B8B5D1" }}>{label}</b>
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontWeight: 700,
                      fontSize: 20,
                      letterSpacing: "-0.02em",
                      color: "#F5F5FA",
                      margin: "0 0 10px",
                    }}
                  >
                    {title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "#B8B5D1",
                      margin: 0,
                    }}
                  >
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Paths preview ─────────────────────────────────────────────────── */}
        <section
          style={{ maxWidth: 1320, margin: "0 auto" }}
          className="landing-section-pad-bottom"
        >
          <div style={{ maxWidth: 720, marginBottom: 56 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "#6B6890",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{ width: 20, height: 1, background: "#0AFFD4", display: "inline-block" }}
              />
              03 · LES PARCOURS
            </div>
            <h2
              aria-label="Choisis ta spécialité."
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 800,
                fontSize: "clamp(36px, 4.5vw, 60px)",
                lineHeight: 1.0,
                letterSpacing: "-0.035em",
                color: "#F5F5FA",
                margin: "0 0 18px",
              }}
            >
              Choisis ta{" "}
              <em
                style={{
                  fontStyle: "normal",
                  background: "linear-gradient(135deg, #0024FF 0%, #0AFFD4 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                spécialité
              </em>
              .
            </h2>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 16,
                color: "#B8B5D1",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {stats.publishedPaths} parcours structurés. Chacun te mène d&apos;une compétence brute
              à un certificat vérifiable.
            </p>
          </div>

          <div className="grid-3-col">
            {featuredPaths
              .map((p) => ({
                path: p,
                ...CATEGORY_STYLE[p.category],
                lvl: DIFFICULTY_LABEL[p.difficulty],
              }))
              .map(({ path, kind, tag, color, lvl }) => (
                <Link
                  key={path.slug}
                  href={`/catalogue#${path.slug}`}
                  style={{
                    position: "relative",
                    background: "#0A0826",
                    border: `1px solid ${color}33`,
                    padding: "24px 24px 22px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    textDecoration: "none",
                    color: "inherit",
                    overflow: "hidden",
                    transition: "border-color 200ms ease, transform 200ms ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = `${color}66`;
                    (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-3px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = `${color}33`;
                    (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: `radial-gradient(ellipse 100% 70% at 50% 120%, ${color}18, transparent 70%)`,
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        fontSize: 9.5,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: color,
                        background: `${color}14`,
                        border: `1px solid ${color}44`,
                        padding: "4px 10px",
                      }}
                    >
                      {tag}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "#6B6890",
                      }}
                    >
                      {lvl}
                    </span>
                  </div>
                  <div style={{ color: color, filter: `drop-shadow(0 0 12px ${color})` }}>
                    <PathIcon kind={kind} />
                  </div>
                  <div>
                    <h3
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontWeight: 700,
                        fontSize: 20,
                        letterSpacing: "-0.02em",
                        color: "#F5F5FA",
                        margin: "0 0 10px",
                      }}
                    >
                      {path.title}
                    </h3>
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 13.5,
                        lineHeight: 1.55,
                        color: "#B8B5D1",
                        margin: 0,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {path.description}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingTop: 8,
                      borderTop: "1px solid #1F1B47",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "#6B6890",
                      letterSpacing: "0.06em",
                    }}
                  >
                    <span>
                      <b style={{ color: "#F5F5FA" }}>{path.lessons}</b> leçons ·{" "}
                      <b style={{ color: "#0AFFD4" }}>{path.xp.toLocaleString("fr-FR")}</b> XP
                    </span>
                    <span style={{ color: "#0AFFD4", fontWeight: 700 }}>→</span>
                  </div>
                </Link>
              ))}
          </div>
        </section>

        {/* ── CTA section ───────────────────────────────────────────────────── */}
        <section
          className="landing-cta-section"
          style={{
            position: "relative",
            borderTop: "1px solid #1F1B47",
            borderBottom: "1px solid #1F1B47",
            textAlign: "center",
            overflow: "hidden",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(to right, rgba(42,37,96,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(42,37,96,0.3) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              pointerEvents: "none",
            }}
          />
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse 700px 400px at 50% 50%, rgba(0,36,255,0.15), transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "#6B6890",
                marginBottom: 24,
              }}
            >
              {"// READY · PLAYER · ONE"}
            </div>
            <h2
              aria-label="Prêt à commencer ta mission ?"
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 800,
                fontSize: "clamp(44px, 6vw, 88px)",
                lineHeight: 0.95,
                letterSpacing: "-0.04em",
                color: "#F5F5FA",
                margin: "0 0 40px",
              }}
            >
              Prêt à commencer{" "}
              <em
                style={{
                  fontStyle: "normal",
                  background: "linear-gradient(135deg, #0024FF 0%, #0AFFD4 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                ta mission
              </em>{" "}
              ?
            </h2>
            <Link
              href="/register"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                padding: "18px 36px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                background: "#0024FF",
                border: "1px solid #0024FF",
                color: "#fff",
                textDecoration: "none",
                boxShadow: "0 0 40px rgba(0,36,255,0.55), inset 0 0 0 1px rgba(255,255,255,0.1)",
                transition: "background 180ms ease, box-shadow 180ms ease",
              }}
            >
              Commencer gratuitement
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
                <path d="M3 8 H13 M9 4 L13 8 L9 12" />
              </svg>
            </Link>
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer style={{ borderTop: "1px solid #1F1B47" }}>
          <div
            className="landing-footer-inner"
            style={{
              maxWidth: 1320,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 24,
            }}
          >
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
                width={26}
                height={26}
                style={{ objectFit: "contain" }}
              />
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: "-0.01em",
                }}
              >
                cyber<span style={{ color: "#0AFFD4" }}>learn</span>
              </span>
            </Link>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 28px" }}>
              {(
                [
                  { label: "Application", href: "/download" },
                  { label: "Vérifier un certificat", href: "/verify" },
                  { label: "Contact", href: "/contact" },
                  { label: "Confidentialité", href: "/privacy" },
                  { label: "Mentions légales", href: "/legal" },
                ] as { label: string; href: string }[]
              ).map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="footer-link"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#6B6890",
                    textDecoration: "none",
                  }}
                >
                  {label}
                </a>
              ))}
            </div>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "#3F3D5C",
                letterSpacing: "0.06em",
              }}
            >
              © {new Date().getFullYear()} Cyber Learn
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
