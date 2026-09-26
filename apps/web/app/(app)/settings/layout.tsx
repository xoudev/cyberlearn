import React from "react";
import type { Metadata } from "next";
import { prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { SettingsNav } from "./_components/SettingsNav";
import { MONO, S, SANS } from "./_components/tokens";

export const metadata: Metadata = {
  // An object, not a string: a plain title here drops the root template for
  // every settings page below it, which then read "Profil" with no site name.
  title: { default: "Paramètres", template: "%s · Paramètres · CyberLearn" },
  description: "Gérez votre profil, votre confidentialité et vos préférences.",
};

// Scoped responsive rules (inline styles can't express media queries).
const RESPONSIVE_CSS = `
@media (max-width: 900px) {
  .settings-shell__grid { grid-template-columns: 1fr !important; gap: 24px !important; }
  .settings-shell__nav { position: static !important; }
}
@media (max-width: 720px) { .settings-shell__head { grid-template-columns: 1fr !important; gap: 16px !important; } }
@media (max-width: 600px) { .settings-profile__row { grid-template-columns: 1fr !important; } }
@media (max-width: 680px) { .settings-visibility { grid-template-columns: 1fr !important; } }
`;

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const authUser = await requireRequestUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { username: true },
  });
  const username = dbUser?.username ?? "agent";

  return (
    <div className="page-container settings-shell">
      <style>{RESPONSIVE_CSS}</style>

      {/* Breadcrumb */}
      <div
        style={{
          fontFamily: MONO,
          fontSize: 12,
          letterSpacing: "0.04em",
          color: S.muted,
          marginBottom: 26,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ color: S.turq }}>$</span>
        <span>~/</span>
        <b style={{ color: S.fg2, fontWeight: 500 }}>cyberlearn</b>
        <span style={{ color: S.disabled }}>/</span>
        <span style={{ color: S.fg, fontWeight: 500 }}>paramètres</span>
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: 7,
            height: 13,
            background: S.turq,
            boxShadow: `0 0 8px ${S.turq}`,
            marginLeft: 4,
            verticalAlign: "-2px",
            animation: "blink 1s step-end infinite",
          }}
        />
      </div>

      {/* Header */}
      <header
        className="settings-shell__head"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          alignItems: "end",
          gap: 32,
          paddingBottom: 30,
          marginBottom: 36,
          borderBottom: `1px solid ${S.border}`,
        }}
      >
        <div>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: S.muted,
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <span
              aria-hidden="true"
              style={{ width: 28, height: 1, background: S.turq, boxShadow: `0 0 6px ${S.turq}` }}
            />
            Compte · Configuration
          </span>
          <h1
            style={{
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: "clamp(44px, 5.4vw, 76px)",
              lineHeight: 0.9,
              letterSpacing: "-0.045em",
              color: S.fg,
              margin: 0,
            }}
          >
            PARAMÈTRES
          </h1>
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: S.muted,
            textAlign: "right",
            lineHeight: 1.8,
          }}
        >
          <div>
            Session · <b style={{ color: S.turq, fontWeight: 600 }}>@{username}</b>
          </div>
        </div>
      </header>

      {/* Nav + content */}
      <div
        className="settings-shell__grid"
        style={{
          display: "grid",
          gridTemplateColumns: "232px minmax(0, 1fr)",
          gap: 40,
          alignItems: "start",
        }}
      >
        <div className="settings-shell__nav">
          <SettingsNav />
        </div>
        <div style={{ minWidth: 0 }}>{children}</div>
      </div>
    </div>
  );
}
