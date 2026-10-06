import React from "react";
import Link from "next/link";
import { Crumb } from "@/components/crumb";

/**
 * Shown instead of the challenges catalog while no active challenge exists
 * (content reboot: lessons and paths ship first, challenges are reworked
 * after). Server component: pure static markup, removed automatically the
 * day an active challenge lands.
 */
export function ChallengesWip(): React.ReactElement {
  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <Crumb segments={["défis"]} caret={false} />

      {/* Eyebrow */}
      <div
        className="mono-label"
        style={{
          color: "#7F7BA9",
          marginBottom: 14,
        }}
      >
        <span style={{ color: "#44406B" }}>{"// "}</span>
        STATUS · <b style={{ color: "#FFB020", fontWeight: 500 }}>WORK IN PROGRESS</b>
      </div>

      {/* Title */}
      <h1
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 800,
          fontSize: "clamp(40px, 5.5vw, 72px)",
          lineHeight: 1.1,
          letterSpacing: "-0.035em",
          color: "#F5F5FA",
          margin: "0 0 24px",
          maxWidth: 920,
        }}
      >
        Les défis arrivent{" "}
        <em
          style={{
            fontStyle: "normal",
            background: "linear-gradient(180deg, #FFB547, #FF4757)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          bientôt
        </em>
        .
      </h1>

      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 15,
          lineHeight: 1.55,
          color: "#B8B5D1",
          maxWidth: 620,
          margin: "0 0 44px",
        }}
      >
        Cette section est en cours de construction : CTF, puzzles et labs sont en préparation. En
        attendant, les leçons et les parcours t&apos;attendent.
      </p>

      <div
        style={{
          padding: "48px 40px",
          textAlign: "center",
          border: "1px dashed rgba(255,176,32,0.35)",
          background: "rgba(255,176,32,0.04)",
          marginBottom: 40,
        }}
      >
        <div
          className="mono-label mono-label--md"
          style={{
            fontWeight: 700,
            color: "#FFB020",
          }}
        >
          [ WIP ] · défis en préparation
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Link
          href="/lessons"
          className="btn btn--lg"
          style={{
            position: "relative",
          }}
        >
          Explorer les leçons{" "}
          <span
            style={{
              color: "var(--cosmetic-accent)",
              textShadow: "0 0 8px color-mix(in srgb, var(--cosmetic-accent) 60%, transparent)",
            }}
          >
            →
          </span>
        </Link>
        <Link
          href="/dashboard"
          className="back-link mono-label"
          style={{
            color: "#7F7BA9",
            textDecoration: "none",
            padding: "16px 8px",
          }}
        >
          ← Retour au dashboard
        </Link>
      </div>
    </div>
  );
}
