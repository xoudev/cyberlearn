import type { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";
import { Crumb } from "@/components/crumb";
import { requireRequestUser } from "@/lib/auth";
import { mockExamOverview } from "@/lib/exam/mock-exam";
import { MockExamFlow } from "./_components/mock-exam-flow";
import "./_components/mock-exam.css";

export const metadata: Metadata = { title: "Examen blanc" };

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * A path's mock exam, the exam itself: started as the page opens, then
 * handed in and corrected. Practice only: no certificate, no XP, as many as
 * wanted. What it covers and the attempts already made are shown before, in
 * a window on the path's page (?mock=1), whose "Commencer" leads here with
 * ?go=1; without it, the address redirects to that window (next.config.ts),
 * so a bookmark never starts the clock. In the site's page container, so it
 * has the width and the gutter of every other page; the paper itself takes
 * the whole screen while it runs.
 */
export default async function MockExamPage({ params }: Props): Promise<React.ReactElement> {
  const { slug } = await params;
  const user = await requireRequestUser();
  const overview = await mockExamOverview(user.id, slug);
  if (overview === null) notFound();

  return (
    <div className="page-container mkx">
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
