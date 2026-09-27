import React from "react";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { requireAdminPage } from "@/lib/auth";
import { prisma } from "@cyberlearn/db";
import { AdminTopbar } from "./_components/admin-topbar";
import { AdminSidebar } from "./_components/admin-sidebar";
import { AdminShellClient } from "./_components/admin-shell-client";

export const metadata: Metadata = {
  title: { default: "Admin · Cyber Learn", template: "%s · Admin" },
};

// Sidebar counts are informative badges - a 30s cache keeps every navigation
// from paying six count queries while staying fresh enough for admin work.
const getSidebarCounts = unstable_cache(
  async () => {
    const [lessons, paths, badges, challenges, users, tickets] = await Promise.all([
      prisma.lesson.count({ where: { status: "PUBLISHED" } }),
      prisma.path.count({ where: { status: "PUBLISHED" } }),
      prisma.badge.count(),
      prisma.challenge.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.contactTicket.count({ where: { status: "OPEN" } }),
    ]);
    return { lessons, paths, badges, challenges, users, tickets };
  },
  ["admin-sidebar-counts"],
  { revalidate: 30 },
);

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  // The check every page repeats (see requireAdminPage): the layout alone is
  // not a gate, since a client navigation can render a page without it.
  const admin = await requireAdminPage();
  const [dbUser, counts] = await Promise.all([
    prisma.user.findUnique({ where: { id: admin.id }, select: { username: true } }),
    getSidebarCounts(),
  ]);

  const emailPrefix = (admin.email ?? "admin").split("@")[0] ?? "admin";
  const displayHandle = dbUser?.username ?? emailPrefix;
  const initials = displayHandle.slice(0, 2).toUpperCase();
  const handle = `@${displayHandle}`;

  return (
    <div className="admin-console" style={{ background: "#030219", minHeight: "100vh" }}>
      <AdminShellClient>
        <AdminTopbar initials={initials} handle={handle} />
        <AdminSidebar
          initials={initials}
          handle={handle}
          email={admin.email ?? ""}
          counts={counts}
        />
        <div className="admin-content-area">{children}</div>
      </AdminShellClient>
    </div>
  );
}
