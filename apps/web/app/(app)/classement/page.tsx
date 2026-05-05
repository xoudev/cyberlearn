import React from "react";
import type { Metadata } from "next";
import { requireRequestUser } from "@/lib/auth";
import { leaderboardRepository } from "@cyberlearn/db";
import { ClassementClient } from "./_components/ClassementClient";

export const metadata: Metadata = { title: "Classement · CyberLearn" };
export const dynamic = "force-dynamic";

export default async function ClassementPage(): Promise<React.ReactElement> {
  const authUser = await requireRequestUser();
  const [entries, userRank] = await Promise.all([
    leaderboardRepository.findTopUsers(100),
    leaderboardRepository.findUserRank(authUser.id),
  ]);
  const currentEntry = entries.find((e) => e.userId === authUser.id) ?? null;

  return (
    <ClassementClient
      entries={entries}
      userRank={userRank}
      currentUserId={authUser.id}
      currentEntry={currentEntry}
    />
  );
}
