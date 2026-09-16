import React from "react";
import type { Metadata } from "next";
import { prisma } from "@cyberlearn/db";
import { KpiCard, Monogram, PageHeader, UI } from "../_components/admin-ui";
import { DataGrid, type GridRow } from "../_components/data-grid";
import { ROLE_LABEL, ROLES, roleRank } from "@/lib/roles";
import { RoleSelect } from "./_components/role-select";

export const metadata: Metadata = { title: "Utilisateurs" };

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function relativeDate(d: Date): string {
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return "aujourd'hui";
  if (diffDays === 1) return "hier";
  if (diffDays < 7) return `il y a ${String(diffDays)} j`;
  return formatDate(d);
}

export default async function AdminUsersPage(): Promise<React.ReactElement> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      role: true,
      level: true,
      xpTotal: true,
      streakDays: true,
      createdAt: true,
      lastActiveAt: true,
      _count: {
        select: {
          badges: true,
          certificates: { where: { revokedAt: null } },
        },
      },
    },
  });

  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const activeThisWeek = users.filter(
    (u) => Date.now() - u.lastActiveAt.getTime() < 7 * 86_400_000,
  ).length;

  const rows: GridRow[] = users.map((u) => {
    const isAdmin = u.role === "ADMIN";
    const handle = u.username ? `@${u.username}` : u.displayName || u.email;
    const recentlyActive = Date.now() - u.lastActiveAt.getTime() < 7 * 86_400_000;

    return {
      id: u.id,
      search: `${handle} ${u.email} ${u.displayName}`.toLowerCase(),
      facets: [u.role],
      sort: [
        handle.toLowerCase(),
        u.email,
        roleRank(u.role),
        u.level,
        u.xpTotal,
        u.streakDays,
        u._count.badges,
        u._count.certificates,
        u.createdAt.getTime(),
        u.lastActiveAt.getTime(),
      ],
      cells: [
        <span key="u" style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
          <Monogram
            text={handle.replace("@", "")}
            size={26}
            tone={isAdmin ? "accent" : "neutral"}
          />
          <span style={{ fontWeight: 600, color: UI.fg, fontSize: 12.5, whiteSpace: "nowrap" }}>
            {handle}
          </span>
        </span>,
        <span key="e" className="mono" style={{ color: UI.muted }}>
          {u.email}
        </span>,
        <RoleSelect key="r" userId={u.id} currentRole={u.role} />,
        <span key="l">
          <span style={{ color: UI.faint }}>LVL·</span>
          <b style={{ color: UI.turquoise }}>{String(u.level).padStart(2, "0")}</b>
        </span>,
        u.xpTotal.toLocaleString("fr-FR"),
        <span key="s" style={{ color: u.streakDays > 0 ? UI.warning : UI.faint }}>
          {String(u.streakDays)} j
        </span>,
        String(u._count.badges),
        String(u._count.certificates),
        <span key="c" style={{ color: UI.muted, whiteSpace: "nowrap" }}>
          {formatDate(u.createdAt)}
        </span>,
        <span
          key="a"
          style={{ color: recentlyActive ? UI.turquoise : UI.faint, whiteSpace: "nowrap" }}
        >
          {relativeDate(u.lastActiveAt)}
        </span>,
      ],
    };
  });

  return (
    <main className="a-page">
      <PageHeader
        eyebrow="Comptes"
        title="Utilisateurs"
        description="Recherche, tri et gestion des rôles. La promotion d'un compte au rôle ADMIN est tracée dans l'audit log."
      />

      <div className="a-kpi-grid">
        <KpiCard label="Total" value={String(users.length)} />
        <KpiCard label="Administrateurs" value={String(adminCount)} tone="info" />
        <KpiCard label="Actifs sur 7 jours" value={String(activeThisWeek)} tone="accent" />
        <KpiCard
          label="Taux d'activité"
          value={
            users.length > 0 ? `${String(Math.round((activeThisWeek / users.length) * 100))}%` : "—"
          }
          tone="purple"
        />
      </div>

      <DataGrid
        columns={[
          { label: "Utilisateur", sortable: true },
          { label: "Email", sortable: true },
          { label: "Rôle", sortable: true },
          { label: "Niveau", align: "right", sortable: true },
          { label: "XP", align: "right", sortable: true },
          { label: "Streak", align: "right", sortable: true },
          { label: "Badges", align: "right", sortable: true },
          { label: "Certifs", align: "right", sortable: true },
          { label: "Inscrit", align: "right", sortable: true },
          { label: "Actif", align: "right", sortable: true },
        ]}
        rows={rows}
        facets={[
          {
            label: "Rôle",
            options: ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] })),
          },
        ]}
        searchPlaceholder="Rechercher un utilisateur, un email…"
        emptyTitle="Aucun utilisateur trouvé"
        emptyText="Modifie la recherche ou le filtre de rôle."
      />
    </main>
  );
}
