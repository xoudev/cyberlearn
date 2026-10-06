import type { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";
import { Crumb } from "@/components/crumb";
import { requireRequestUser } from "@/lib/auth";
import { mockExamOverview } from "@/lib/exam/mock-exam";
import { MockExamFlow } from "./_components/mock-exam-flow";

export const metadata: Metadata = { title: "Examen blanc" };

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * A path's mock exam: what it covers, the attempts already made, and the
 * exam itself. Practice only: no certificate, no XP, as many as wanted.
 */
export default async function MockExamPage({ params }: Props): Promise<React.ReactElement> {
  const { slug } = await params;
  const user = await requireRequestUser();
  const overview = await mockExamOverview(user.id, slug);
  if (overview === null) notFound();

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", display: "grid", gap: 24 }}>
      <Crumb
        segments={[
          { label: "parcours", href: "/paths" },
          { label: slug, href: `/paths/${slug}` },
          "examen blanc",
        ]}
      />
      <MockExamFlow overview={overview} />
    </div>
  );
}
