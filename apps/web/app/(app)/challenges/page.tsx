import React from "react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Défis — CyberLearn" };

export default function ChallengesPage(): React.ReactElement {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 56px 120px" }}>
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
          Défis
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
          Défis &amp; Challenges
        </h1>
      </div>

      <div
        style={{
          padding: "80px 40px",
          textAlign: "center",
          border: "1px dashed #2A2560",
          background: "rgba(5,4,26,0.4)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative background text */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(80px, 12vw, 140px)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            color: "rgba(42,37,96,0.25)",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          CTF
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 20px",
              background: "rgba(0,36,255,0.1)",
              border: "1px solid rgba(0,36,255,0.3)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4D8BFF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
          </div>

          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              fontSize: 20,
              color: "#F5F5FA",
              margin: "0 0 10px",
              letterSpacing: "-0.01em",
            }}
          >
            Bientôt disponible
          </p>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "#6B6890",
              margin: "0 0 28px",
              maxWidth: 420,
              marginInline: "auto",
              lineHeight: 1.6,
            }}
          >
            Les défis CTF arrivent prochainement. Des challenges de cybersécurité, des puzzles de
            code et des épreuves réseau pour tester tes compétences en conditions réelles.
          </p>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              background: "rgba(0,36,255,0.08)",
              border: "1px solid rgba(0,36,255,0.3)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#4D8BFF",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#4D8BFF",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
            En développement
          </div>

          <div style={{ marginTop: 32 }}>
            <Link
              href="/lessons"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#6B6890",
              }}
            >
              ← En attendant, explore les leçons
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
