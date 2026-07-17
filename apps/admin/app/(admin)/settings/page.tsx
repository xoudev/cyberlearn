import React from "react";
import type { Metadata } from "next";
import { prisma } from "@cyberlearn/db";
import { Card, PageHeader, Tag, UI } from "../_components/admin-ui";

export const metadata: Metadata = { title: "Paramètres" };

function DefRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="a-defrow">
      <span className="a-defrow-label">{label}</span>
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
    <main className="a-page">
      <PageHeader
        eyebrow="Système"
        title="Paramètres"
        description="Configuration du runtime, variables d'environnement et volumétrie de la base de données."
      />

      <div className="admin-settings-grid">
        <Card
          title="Variables d'environnement"
          action={
            <Tag tone={allEnvOk ? "accent" : "danger"}>
              {allEnvOk ? "Complètes" : "Incomplètes"}
            </Tag>
          }
        >
          {envVars.map((v) => (
            <DefRow key={v.label} label={v.label}>
              <Tag tone={v.defined ? "accent" : "danger"}>
                {v.defined ? "Définie" : "Manquante"}
              </Tag>
            </DefRow>
          ))}
        </Card>

        <Card title="Base de données">
          {stats.map((s) => (
            <DefRow key={s.label} label={s.label}>
              <b style={{ fontFamily: UI.mono, fontSize: 13, color: UI.turquoise }}>
                {s.val.toLocaleString("fr-FR")}
              </b>
            </DefRow>
          ))}
        </Card>

        <div style={{ gridColumn: "1 / -1" }}>
          <Card title="Informations plateforme">
            {[
              { label: "Version Node.js", val: process.version },
              { label: "Environnement", val: process.env.NODE_ENV },
              { label: "Site URL", val: process.env.NEXT_PUBLIC_SITE_URL ?? "-" },
              { label: "Admin URL", val: process.env.NEXT_PUBLIC_ADMIN_URL ?? "-" },
            ].map((item) => (
              <DefRow key={item.label} label={item.label}>
                <span style={{ fontFamily: UI.mono, fontSize: 12, color: UI.muted }}>
                  {item.val}
                </span>
              </DefRow>
            ))}
          </Card>
        </div>
      </div>
    </main>
  );
}
