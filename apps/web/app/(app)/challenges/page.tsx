import React from "react";
import type { Metadata } from "next";
import {
  CHALLENGES_TABS,
  DEFAULT_CHALLENGES_TAB,
  type ChallengesTab,
} from "@cyberlearn/lib/challenges/tabs";
import { requireRequestUser } from "@/lib/auth";
import { challengeCatalogueFor } from "@/lib/challenges/catalogue";
import { tournamentListFor } from "@/lib/tournaments/tournaments";
import { tabFromQuery } from "@/lib/tab-query";
import { TournamentsList } from "../tournaments/_components/tournaments-list";
import { ChallengesClient } from "./_components/challenges-client";
import { ChallengesHeader } from "./_components/challenges-header";
import { ChallengesWip } from "./_components/challenges-wip";
import "./_components/challenges.css";
import "../tournaments/_components/tournaments.css";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** `?tab=tournois`, or the catalogue for no tab or one the section does not have. */
async function tabOf(searchParams: Props["searchParams"]): Promise<ChallengesTab> {
  return tabFromQuery((await searchParams).tab, CHALLENGES_TABS, DEFAULT_CHALLENGES_TAB);
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return { title: (await tabOf(searchParams)) === "tournois" ? "Tournois" : "Défis" };
}

/** The catalogue of challenges, or the notice that stands for it while there is none. */
async function catalogueTab(userId: string): Promise<React.ReactElement> {
  const now = new Date();
  const { items, weekly } = await challengeCatalogueFor(userId, now);
  // Content reboot: while no active challenge exists, the section reads as
  // work-in-progress instead of an empty catalog.
  if (items.length === 0) return <ChallengesWip />;
  return <ChallengesClient items={items} weekly={weekly} nowMs={now.getTime()} />;
}

/**
 * The CTF tournaments of the reader's classes. Open to everyone: somebody in
 * no class is told why the list is empty.
 */
async function tournamentsTab(userId: string): Promise<React.ReactElement> {
  const { tournaments, inClass } = await tournamentListFor(userId);
  return <TournamentsList tournaments={tournaments} nowMs={Date.now()} inClass={inClass} />;
}

/**
 * The challenges section and its two tabs: the catalogue (/challenges) and
 * the tournaments (/challenges?tab=tournois), which had a page of their own
 * at /tournaments. Each tab reads only its own data.
 */
export default async function ChallengesPage({ searchParams }: Props): Promise<React.ReactElement> {
  const user = await requireRequestUser();
  const tab = await tabOf(searchParams);
  const content = tab === "tournois" ? await tournamentsTab(user.id) : await catalogueTab(user.id);

  return (
    <div className="page-container">
      <ChallengesHeader tab={tab} />
      {content}
    </div>
  );
}
