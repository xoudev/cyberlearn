import type { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";
import { Crumb } from "@/components/crumb";
import { requireRequestUser } from "@/lib/auth";
import { duelViewFor } from "@/lib/social/duels";
import { DuelPlay } from "./_components/duel-play";

export const metadata: Metadata = { title: "Duel" };

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * A duel, for one of its two players: not found for anybody else. The page
 * gives it the site's container and breadcrumb; DuelPlay draws the rest
 * (duels.css), since all of it moves as the duel is read again.
 */
export default async function DuelPage({ params }: Props): Promise<React.ReactElement> {
  const { id } = await params;
  const user = await requireRequestUser();
  const view = await duelViewFor(user.id, id);
  if (view === null) notFound();

  return (
    <div className="page-container dl">
      <Crumb segments={[{ label: "duels", href: "/duels" }, view.other.name]} />
      <DuelPlay initial={view} />
    </div>
  );
}
