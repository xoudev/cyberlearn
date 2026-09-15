import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { classRepository, prisma } from "@cyberlearn/db";
import { PageHeader, Tag, UI } from "../../_components/admin-ui";
import { ClassRoster } from "../_components/ClassRoster";

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

  return (
    <main>
      <div className="mono" style={{ fontSize: 11, color: UI.faint, marginBottom: 10 }}>
        <Link href="/classes" style={{ color: "inherit" }}>
          Classes
        </Link>
        {" / "}
        {klass.promotion.establishment.name}
        {" / "}
        {klass.promotion.name}
      </div>

      <PageHeader
        eyebrow="Classe"
        title={klass.name}
        description={klass.description ?? "Aucune description."}
      />

      {klass.archivedAt !== null && (
        <div style={{ marginTop: 8 }}>
          <Tag tone="warning">Archivée</Tag>
        </div>
      )}

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
          label: `${u.displayName || u.email} ${u.role === "ADMIN" ? "(admin)" : ""}`.trim(),
        }))}
      />
    </main>
  );
}
