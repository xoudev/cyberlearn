import type { Metadata } from "next";
import { redirect } from "next/navigation";
import React from "react";
import { friendshipRepository } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { duelRecordFor, listDuelsFor } from "@/lib/social/duels";
import { DuelsBoard } from "./_components/duels-board";
import { duelsAddressFor } from "./_components/ami-address";

export const metadata: Metadata = { title: "Duels" };

interface Props {
  searchParams: Promise<{ ami?: string | string[] }>;
}

/**
 * The reader's duels, their record over every duel (not only the ones
 * listed) and how many friends they can challenge, drawn by DuelsBoard. The
 * challenge itself is a window over the page (?duel=, challenge-dialog.tsx),
 * which reads the friends and the paths when it opens.
 */
export default async function DuelsPage({ searchParams }: Props): Promise<React.ReactElement> {
  const user = await requireRequestUser();
  // The old address of the form with a friend picked, still in links and
  // bookmarks: the window, with that friend picked.
  const { ami } = await searchParams;
  if (ami !== undefined) redirect(duelsAddressFor(ami));

  const [duels, record, friendIds] = await Promise.all([
    listDuelsFor(user.id),
    duelRecordFor(user.id),
    friendshipRepository.friendIds(user.id),
  ]);

  return <DuelsBoard duels={duels} record={record} friendCount={friendIds.size} />;
}
