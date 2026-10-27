import React from "react";
import type { Metadata } from "next";
import { forumRepository, friendshipRepository } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { ForumHome } from "./_components/forum-home";
import "./community-forum.css";
import "./forum-home.css";

export const metadata: Metadata = { title: "Forum" };
export const dynamic = "force-dynamic";

export default async function ForumPage(): Promise<React.JSX.Element> {
  const user = await requireRequestUser();
  const [categories, recent, friends] = await Promise.all([
    forumRepository.listCategories(user.id),
    forumRepository.listRecentTopics(user.id),
    // The reader's friends, for the mark beside a topic's author.
    friendshipRepository.friendIds(user.id),
  ]);

  return <ForumHome categories={categories} recent={recent} friends={friends} />;
}
