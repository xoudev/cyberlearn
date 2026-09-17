import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { forumRepository } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { Crumbs, ForumHeader } from "../../_components/forum-bits";
import { TopicComposer } from "../../_components/topic-composer";
import "../../forum.css";

export const metadata: Metadata = { title: "Nouveau sujet" };
export const dynamic = "force-dynamic";

export default async function NewTopicPage({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<React.JSX.Element> {
  const user = await requireRequestUser();
  const { category } = await params;

  // Reads the section rather than trusting the address: the composer names it
  // in its placeholder, and a page that invites a post into a section that does
  // not exist only fails once the post is written.
  const data = await forumRepository.listTopics(category, user.id, 1);
  if (!data) notFound();

  return (
    <div className="fo-page">
      <Crumbs
        trail={[
          { label: "Forum", href: "/forum" },
          { label: data.category.name, href: `/forum/${category}` },
          { label: "Nouveau sujet" },
        ]}
      />
      <ForumHeader
        eyebrow={data.category.name}
        title="Nouveau sujet"
        accent={data.category.accent}
        lede="Tout le monde sur la plateforme peut le lire et y répondre."
      />
      <TopicComposer categorySlug={category} categoryName={data.category.name} />
    </div>
  );
}
