import React from "react";
import type { Metadata } from "next";
import { prisma } from "@cyberlearn/db";
import { Card, PageHeader, Tag } from "../_components/admin-ui";
import { SETTINGS_CARDS, SETTINGS_HEADER } from "./_components/settings-head";

import { requireAdminPage } from "@/lib/auth";

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
  await requireAdminPage();
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
        crumbs={SETTINGS_HEADER.crumbs}
        title={SETTINGS_HEADER.title}
        description={SETTINGS_HEADER.description}
      />

      <div className="admin-settings-grid">
        <Card
          title={SETTINGS_CARDS.env}
          action={
            <Tag tone={allEnvOk ? "success" : "danger"}>
              {allEnvOk ? "Complètes" : "Incomplètes"}
            </Tag>
          }
        >
          {envVars.map((v) => (
            <DefRow key={v.label} label={v.label}>
              <Tag tone={v.defined ? "success" : "danger"}>
                {v.defined ? "Définie" : "Manquante"}
              </Tag>
            </DefRow>
          ))}
        </Card>

        <Card title={SETTINGS_CARDS.database}>
          {stats.map((s) => (
            <DefRow key={s.label} label={s.label}>
              <b style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--a-fg)" }}>
                {s.val.toLocaleString("fr-FR")}
              </b>
            </DefRow>
          ))}
        </Card>

        <div style={{ gridColumn: "1 / -1" }}>
          <Card title={SETTINGS_CARDS.platform}>
            {[
              { label: "Version Node.js", val: process.version },
              { label: "Environnement", val: process.env.NODE_ENV },
              { label: "Site URL", val: process.env.NEXT_PUBLIC_SITE_URL ?? "-" },
              { label: "Admin URL", val: process.env.NEXT_PUBLIC_ADMIN_URL ?? "-" },
            ].map((item) => (
              <DefRow key={item.label} label={item.label}>
                <span
                  style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--a-muted)" }}
                >
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
