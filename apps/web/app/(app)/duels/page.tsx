import type { Metadata } from "next";
import React from "react";
import { getSharedUserProfile, requireRequestUser } from "@/lib/auth";
import { duelRecordFor, duelSetupFor, listDuelsFor } from "@/lib/social/duels";
import { DuelsBoard } from "./_components/duels-board";

export const metadata: Metadata = { title: "Duels" };

interface Props {
  searchParams: Promise<{ ami?: string }>;
}

/**
 * The reader's duels, their record over every duel (not only the ones
 * listed), their friends and the paths they can duel on, drawn by DuelsBoard.
 */
export default async function DuelsPage({ searchParams }: Props): Promise<React.ReactElement> {
  const user = await requireRequestUser();
  const { ami } = await searchParams;
  const [duels, record, setup, profile] = await Promise.all([
    listDuelsFor(user.id),
    duelRecordFor(user.id),
    duelSetupFor(user.id),
    getSharedUserProfile(),
  ]);
  const readerName =
    [profile?.displayName, duels[0]?.reader.name].find(
      (name) => name !== undefined && name !== "",
    ) ?? "";

  return (
    <DuelsBoard
      duels={duels}
      record={record}
      friends={setup.friends}
      paths={setup.paths}
      initialFriend={ami ?? null}
      readerName={readerName}
    />
  );
}
