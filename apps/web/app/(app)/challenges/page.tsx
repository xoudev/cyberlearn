import React from "react";
import type { Metadata } from "next";
import { requireRequestUser } from "@/lib/auth";
import { challengeItemsFor } from "@/lib/challenges/catalogue";
import { ChallengesClient } from "./_components/challenges-client";
import { ChallengesWip } from "./_components/challenges-wip";

export const metadata: Metadata = { title: "Défis & Challenges" };

function featuredWeekEndMs(): number {
  // End of current ISO week (Sunday 23:59:59 UTC)
  const now = new Date();
  const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
  const end = new Date(now);
  end.setUTCDate(now.getUTCDate() + daysUntilSunday);
  end.setUTCHours(23, 59, 59, 0);
  return end.getTime();
}

export default async function ChallengesPage(): Promise<React.ReactElement> {
  const user = await requireRequestUser();
  const items = await challengeItemsFor(user.id);

  // Content reboot: while no active challenge exists, the section reads as
  // work-in-progress instead of an empty catalog.
  if (items.length === 0) return <ChallengesWip />;

  const featured =
    items
      .filter((c) => c.displayStatus === "AVAILABLE" || c.displayStatus === "IN_PROGRESS")
      .sort((a, b) => b.xpReward - a.xpReward)[0] ?? null;

  return <ChallengesClient items={items} featured={featured} featuredEndMs={featuredWeekEndMs()} />;
}
