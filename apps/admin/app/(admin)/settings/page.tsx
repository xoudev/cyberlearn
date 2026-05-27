import React from "react";
import type { Metadata } from "next";
import { prisma } from "@cyberlearn/db";

export const metadata: Metadata = { title: "Paramètres" };

const BORDER = "#1F1B47";
const DANGER = "#FF4D6D";
const TURQUOISE = "#0AFFD4";

function EnvCheck({ label, defined }: { label: string; defined: boolean }): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "11px 16px",
        borderBottom: `1px solid rgba(31,27,71,0.4)`,
      }}
    >
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#B8B5D1" }}>
        {label}
      </span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: defined ? TURQUOISE : DANGER,
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: defined ? TURQUOISE : DANGER,
            flexShrink: 0,
          }}
        />
        {defined ? "Défini" : "Manquant"}
      </span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: DANGER,
        padding: "14px 16px 10px",
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      {"// "}
      {children}
    </div>
  );
}

export default async function AdminSettingsPage(): Promise<React.ReactElement> {
  const [userCount, lessonCount, pathCount, badgeCount, certCount, ticketCount, logCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.lesson.count(),
      prisma.path.count(),
      prisma.badge.count(),
      prisma.certificate.count({ where: { revokedAt: null } }),
      prisma.contactTicket.count(),
      prisma.auditLog.count(),
    ]);

  const envVars = [
    { label: "NEXT_PUBLIC_SUPABASE_URL", defined: !!process.env.NEXT_PUBLIC_SUPABASE_URL },
    {
      label: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      defined: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    { label: "SUPABASE_SERVICE_ROLE_KEY", defined: !!process.env.SUPABASE_SERVICE_ROLE_KEY },
    { label: "DATABASE_URL", defined: !!process.env.DATABASE_URL },
    { label: "IP_SALT", defined: !!process.env.IP_SALT },
    { label: "NEXT_PUBLIC_SITE_URL", defined: !!process.env.NEXT_PUBLIC_SITE_URL },
    { label: "NEXT_PUBLIC_ADMIN_URL", defined: !!process.env.NEXT_PUBLIC_ADMIN_URL },
  ];

  const allEnvOk = envVars.every((v) => v.defined);

  const stats = [
    { label: "Utilisateurs", val: userCount },
    { label: "Leçons", val: lessonCount },
    { label: "Parcours", val: pathCount },
    { label: "Badges", val: badgeCount },
    { label: "Certificats", val: certCount },
    { label: "Tickets", val: ticketCount },
    { label: "Entrées d'audit", val: logCount },
  ];

  return (
    <div className="admin-page-content">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
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
            marginBottom: 8,
          }}
        >
          <span style={{ width: 14, height: 1, background: DANGER, display: "inline-block" }} />
          Admin / Paramètres
        </div>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 24,
            fontWeight: 700,
            color: "#F5F5FA",
            margin: 0,
          }}
        >
          Paramètres système
        </h1>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#6B6890",
            margin: "6px 0 0",
          }}
        >
          Configuration, variables d&apos;environnement et état de la base de données.
        </p>
      </div>

      <div className="admin-settings-grid">
        {/* Env check */}
        <section>
          <div
            style={{
              background: "rgba(5,4,26,0.4)",
              border: `1px solid ${allEnvOk ? BORDER : "rgba(255,77,109,0.4)"}`,
            }}
          >
            <SectionTitle>Variables d&apos;environnement</SectionTitle>
            {envVars.map((v) => (
              <EnvCheck key={v.label} label={v.label} defined={v.defined} />
            ))}
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${BORDER}` }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: allEnvOk ? TURQUOISE : DANGER,
                }}
              >
                {allEnvOk
                  ? "✓ Toutes les variables sont définies"
                  : "⚠ Des variables sont manquantes"}
              </span>
            </div>
          </div>
        </section>

        {/* DB stats */}
        <section>
          <div style={{ background: "rgba(5,4,26,0.4)", border: `1px solid ${BORDER}` }}>
            <SectionTitle>Base de données</SectionTitle>
            {stats.map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "11px 16px",
                  borderBottom: `1px solid rgba(31,27,71,0.4)`,
                }}
              >
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#B8B5D1" }}>
                  {s.label}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: 13,
                    color: TURQUOISE,
                  }}
                >
                  {s.val.toLocaleString("fr-FR")}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Platform info */}
        <section style={{ gridColumn: "1 / -1" }}>
          <div style={{ background: "rgba(5,4,26,0.4)", border: `1px solid ${BORDER}` }}>
            <SectionTitle>Informations plateforme</SectionTitle>
            {[
              { label: "Version Node.js", val: process.version },
              { label: "Environnement", val: process.env.NODE_ENV },
              { label: "Site URL", val: process.env.NEXT_PUBLIC_SITE_URL ?? "-" },
              { label: "Admin URL", val: process.env.NEXT_PUBLIC_ADMIN_URL ?? "-" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "11px 16px",
                  borderBottom: `1px solid rgba(31,27,71,0.4)`,
                }}
              >
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#B8B5D1" }}>
                  {item.label}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#44406B" }}>
                  {item.val}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
