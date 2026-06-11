import React from "react";
import type { Metadata } from "next";
import { requireRequestUser } from "@/lib/auth";
import { challengeRepository } from "@cyberlearn/db";
import { ChallengesClient } from "./_components/challenges-client";
import type { ChallengeItem } from "./_components/challenges-client";
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
  const raw = await challengeRepository.findAllActive(user.id);

  // Content reboot: while no active challenge exists, the section reads as
  // work-in-progress instead of an empty catalog.
  if (raw.length === 0) return <ChallengesWip />;

  const titleById = new Map(raw.map((c) => [c.id, c.title]));
  const completedIds = new Set(raw.filter((c) => c.userStatus === "COMPLETED").map((c) => c.id));

  const items: ChallengeItem[] = raw.map((c) => {
    let displayStatus: ChallengeItem["displayStatus"];
    if (c.userStatus === "COMPLETED") {
      displayStatus = "COMPLETED";
    } else if (c.userStatus === "IN_PROGRESS") {
      displayStatus = "IN_PROGRESS";
    } else if (c.prerequisiteId !== null && !completedIds.has(c.prerequisiteId)) {
      displayStatus = "LOCKED";
    } else {
      displayStatus = "AVAILABLE";
    }

    return {
      id: c.id,
      refCode: c.refCode,
      slug: c.slug,
      title: c.title,
      description: c.description,
      category: c.category,
      difficulty: c.difficulty,
      type: c.type,
      xpReward: c.xpReward,
      timeLimitMin: c.timeLimitMin,
      maxAttempts: c.maxAttempts,
      userAttempts: c.userAttempts,
      displayStatus,
      lockedByTitle: c.prerequisiteId !== null ? (titleById.get(c.prerequisiteId) ?? null) : null,
    };
  });

  const featured =
    items
      .filter((c) => c.displayStatus === "AVAILABLE" || c.displayStatus === "IN_PROGRESS")
      .sort((a, b) => b.xpReward - a.xpReward)[0] ?? null;

  return <ChallengesClient items={items} featured={featured} featuredEndMs={featuredWeekEndMs()} />;
}
