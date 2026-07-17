import React from "react";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
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
}: { children: React.ReactNode }): Promise<React.ReactElement> {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // The verified TOTP factors ride on the user object already fetched above -
  // calling mfa.listFactors() would trigger a second network roundtrip.
  const hasVerifiedTotp =
    user.factors?.some((factor) => factor.factor_type === "totp" && factor.status === "verified") ??
    false;
  if (!hasVerifiedTotp) redirect("/mfa/setup");

  const [dbUser, assurance, counts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, username: true },
    }),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    getSidebarCounts(),
  ]);

  if (dbUser?.role !== "ADMIN") notFound();
  if (assurance.error || assurance.data.currentLevel !== "aal2") redirect("/mfa");

  const emailPrefix = (user.email ?? "admin").split("@")[0] ?? "admin";
  const displayHandle = dbUser.username ?? emailPrefix;
  const initials = displayHandle.slice(0, 2).toUpperCase();
  const handle = `@${displayHandle}`;

  return (
    <div className="admin-console" style={{ background: "#030219", minHeight: "100vh" }}>
      <AdminShellClient>
        <AdminTopbar initials={initials} handle={handle} />
        <AdminSidebar
          initials={initials}
          handle={handle}
          email={user.email ?? ""}
          counts={counts}
        />
        <div className="admin-content-area">{children}</div>
      </AdminShellClient>
    </div>
  );
}
