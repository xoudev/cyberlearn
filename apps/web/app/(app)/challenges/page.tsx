import React from "react";
import type { Metadata } from "next";
import { requireRequestUser } from "@/lib/auth";
import { challengeCatalogueFor } from "@/lib/challenges/catalogue";
import { ChallengesClient } from "./_components/challenges-client";
import { ChallengesWip } from "./_components/challenges-wip";

export const metadata: Metadata = { title: "Défis" };

export default async function ChallengesPage(): Promise<React.ReactElement> {
  const user = await requireRequestUser();
  const now = new Date();
  const { items, weekly } = await challengeCatalogueFor(user.id, now);

  // Content reboot: while no active challenge exists, the section reads as
  // work-in-progress instead of an empty catalog.
  if (items.length === 0) return <ChallengesWip />;

  return <ChallengesClient items={items} weekly={weekly} nowMs={now.getTime()} />;
}
