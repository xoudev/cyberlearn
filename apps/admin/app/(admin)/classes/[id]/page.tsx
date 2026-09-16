import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { classRepository, prisma } from "@cyberlearn/db";
import { GhostLink, PageHeader, Tag } from "../../_components/admin-ui";
import { ClassRoster } from "../_components/class-roster";

export const metadata: Metadata = { title: "Classe" };
export const dynamic = "force-dynamic";

export default async function AdminClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;

  const [klass, teacherPool] = await Promise.all([
    classRepository.findById(id),
    // Only accounts that can actually follow a class. Assigning a student here
    // would hand them their classmates' progress, so they are not offered.
    prisma.user.findMany({
      where: { role: { in: ["TEACHER", "ADMIN"] } },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true, email: true, role: true },
    }),
  ]);

  if (!klass) notFound();

  const archived = klass.archivedAt !== null;

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
      />
    </main>
  );
}
