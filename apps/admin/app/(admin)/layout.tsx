import React from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@cyberlearn/db";
import { AdminNavbar } from "./_components/admin-navbar";
import { AdminSidebar } from "./_components/admin-sidebar";
import { AdminShellClient } from "./_components/admin-shell-client";

export const metadata: Metadata = {
  title: { default: "Admin — Cyber Learn", template: "%s — Admin" },
};

export default async function AdminLayout({
  children,
}: { children: React.ReactNode }): Promise<React.ReactElement> {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // JWT role (set by Supabase Auth Hook in production).
  // Falls back to the DB role in dev where the hook may not be running.
  const jwtRole = user.app_metadata.user_role as string | undefined;
  let role = jwtRole;
  if (!role) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
    role = dbUser?.role ?? undefined;
  }

  if (role !== "ADMIN") notFound();

  const admin = { id: user.id, email: user.email, role: "ADMIN" as const };

  const emailPrefix = (admin.email ?? "admin").split("@")[0] ?? "admin";
  const initials = emailPrefix.slice(0, 2).toUpperCase();
  const handle = "@" + emailPrefix;

  const [lessonCount, pathCount, badgeCount, challengeCount, userCount, ticketCount] =
    await Promise.all([
      prisma.lesson.count({ where: { status: "PUBLISHED" } }),
      prisma.path.count({ where: { status: "PUBLISHED" } }),
      prisma.badge.count(),
      prisma.challenge.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.contactTicket.count({ where: { status: "OPEN" } }),
    ]);

  return (
    <div style={{ background: "#030219", minHeight: "100vh" }}>
      <AdminShellClient>
        <AdminNavbar initials={initials} handle={handle} />
        <AdminSidebar
          initials={initials}
          handle={handle}
          email={admin.email ?? ""}
          counts={{
            lessons: lessonCount,
            paths: pathCount,
            badges: badgeCount,
            challenges: challengeCount,
            users: userCount,
            tickets: ticketCount,
          }}
        />
        <div className="admin-content-area">{children}</div>
      </AdminShellClient>
    </div>
  );
}
