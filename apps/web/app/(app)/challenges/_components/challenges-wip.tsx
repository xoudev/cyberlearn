import React from "react";
import Link from "next/link";

/**
 * Shown instead of the challenges catalog while no active challenge exists
 * (content reboot: lessons and paths ship first, challenges are reworked
 * after). Server component: pure static markup, removed automatically the
 * day an active challenge lands. The breadcrumb, the section's title and its
 * tabs are drawn above it by the page (challenges-header.tsx): the
 * tournaments tab stays open meanwhile.
 */
export function ChallengesWip(): React.ReactElement {
  return (
    <div>
      {/* Eyebrow */}
      <div
        className="mono-label"
        style={{
          color: "var(--color-text-muted)",
          marginBottom: 14,
        }}
      >
        <span style={{ color: "var(--color-text-faint)" }}>{"// "}</span>
        STATUS · <b style={{ color: "var(--color-warning)", fontWeight: 500 }}>WORK IN PROGRESS</b>
      </div>

      {/* Title */}
      <h2
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 800,
          fontSize: "clamp(32px, 4vw, 52px)",
          lineHeight: 1.1,
          letterSpacing: "-0.035em",
          color: "var(--color-text-primary)",
          margin: "0 0 24px",
          maxWidth: 920,
        }}
      >
        Les défis arrivent{" "}
        <em
          style={{
            fontStyle: "normal",
            background:
              "linear-gradient(180deg, var(--color-rarity-legendary), var(--color-category-cybersec))",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          bientôt
        </em>
        .
      </h2>

      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 15,
          lineHeight: 1.55,
          color: "var(--color-text-secondary)",
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
            color: "var(--color-warning)",
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
            color: "var(--color-text-muted)",
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
