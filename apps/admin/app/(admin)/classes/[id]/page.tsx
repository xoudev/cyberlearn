import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { classRepository, prisma } from "@cyberlearn/db";
import { GhostLink, PageHeader, Tag } from "../../_components/admin-ui";
import { ClassDetailsForm } from "../_components/class-details-form";
import { ClassRoster } from "../_components/class-roster";

export const metadata: Metadata = { title: "Classe" };
export const dynamic = "force-dynamic";

function formatDay(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(d);
}

/**
 * An invitation outlives the administrator who sent it: invitedById is SET NULL
 * on delete, so the place stays held even once that account is gone.
 */
function senderLabel(sender: { displayName: string; email: string } | null): string {
  if (sender === null) return "un administrateur";
  return sender.displayName.trim() || sender.email;
}

export default async function AdminClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;

  const [klass, teacherPool, directory, invitations] = await Promise.all([
    classRepository.findById(id),
    // Only accounts that can actually follow a class. Assigning a student here
    // would hand them their classmates' progress, so they are not offered.
    prisma.user.findMany({
      where: { role: { in: ["TEACHER", "ADMIN"] } },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true, email: true, role: true },
    }),
    // The picker filters in the browser, so the directory arrives with the
    // page. A school is hundreds of people, not millions; the day that stops
    // being true this becomes a server search, and the component's own comment
    // says so.
    prisma.user.findMany({
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true, username: true, email: true, role: true },
    }),
    classRepository.listPendingInvitations(id),
  ]);

  if (!klass) notFound();

  const archived = klass.archivedAt !== null;
  const memberIds = new Set(klass.members.map((m) => m.user.id));

  return (
    <main className="a-page">
      <PageHeader
        // Where the class sits is the eyebrow's job - it is the line above the
        // name on every other page of the console, and it answers "which
        // SIO1-A?" without a separate breadcrumb row.
        eyebrow={`${klass.promotion.establishment.name} · ${klass.promotion.name}`}
        title={
          <>
            {klass.name}
            {archived && (
              <>
                {" "}
                <Tag tone="warning">Archivée</Tag>
              </>
            )}
          </>
        }
        description={klass.description ?? "Aucune description."}
        actions={<GhostLink href="/classes">Retour aux classes</GhostLink>}
      />

      <ClassDetailsForm
        classId={klass.id}
        name={klass.name}
        slug={klass.slug}
        description={klass.description}
        archived={archived}
      />

      <ClassRoster
        classId={klass.id}
        teachers={klass.teachers.map((t) => ({
          id: t.teacher.id,
          name: t.teacher.displayName || (t.teacher.username ?? "—"),
          subject: t.subject,
        }))}
        members={klass.members.map((m) => ({
          id: m.user.id,
          name: m.user.displayName || (m.user.username ?? "—"),
          email: m.user.email,
          role: m.user.role,
          joinedAt: m.joinedAt.toISOString(),
        }))}
        teacherPool={teacherPool.map((u) => ({
          id: u.id,
          label: `${u.displayName || u.email}${u.role === "ADMIN" ? " (admin)" : ""}`,
        }))}
        candidates={directory
          .filter((u) => !memberIds.has(u.id))
          .map((u) => ({
            id: u.id,
            label: u.displayName || (u.username ?? u.email),
            email: u.email,
            role: u.role,
            search: `${u.displayName} ${u.username ?? ""} ${u.email}`.toLowerCase(),
          }))}
        invitations={invitations.map((i) => ({
          id: i.id,
          email: i.email,
          invitedBy: senderLabel(i.invitedBy),
          expiresAt: formatDay(i.expiresAt),
          expired: i.expiresAt.getTime() < Date.now(),
        }))}
      />
    </main>
  );
}
