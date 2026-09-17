import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { POSTS_PER_PAGE, forumRepository } from "@cyberlearn/db";
import { getSharedUserProfile, requireRequestUser } from "@/lib/auth";
import { Crumbs, ForumHeader, authorName, formatDate } from "../../_components/forum-bits";
import { PostCard } from "../../_components/post-card";
import { ReplyBox } from "../../_components/reply-box";
import { TopicTools } from "../../_components/topic-tools";
import "../../forum.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; topic: string }>;
}): Promise<Metadata> {
  const { category, topic } = await params;
  const title = await forumRepository.findTopicTitle(category, topic);
  return { title: title !== null ? `${title} · Forum` : "Forum" };
}

export default async function ForumTopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; topic: string }>;
  searchParams: Promise<{ page?: string }>;
}): Promise<React.JSX.Element> {
  const user = await requireRequestUser();
  const { category, topic } = await params;
  const { page } = await searchParams;
  const current = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);

  const [view, profile] = await Promise.all([
    forumRepository.findTopic(category, topic, user.id, current),
    getSharedUserProfile(),
  ]);
  if (!view) notFound();

  const isAdmin = profile?.role === "ADMIN";
  const path = `/forum/${category}/${topic}`;
  const pages = Math.max(1, Math.ceil(view.postCount / POSTS_PER_PAGE));

  return (
    <div className="fo-page">
      <Crumbs
        trail={[
          { label: "Forum", href: "/forum" },
          { label: view.categoryName, href: `/forum/${category}` },
          { label: view.title },
        ]}
      />
      <ForumHeader
        eyebrow={`Ouvert par ${authorName(view.author)} · ${formatDate(view.createdAt)}`}
        title={
          <>
            {view.pinned && <span className="fo-tag fo-tag--pinned">Épinglé</span>}{" "}
            {view.locked && <span className="fo-tag fo-tag--locked">Fermé</span>} {view.title}
          </>
        }
        accent={view.categoryAccent}
        actions={
          isAdmin ? (
            <TopicTools topicId={view.id} pinned={view.pinned} locked={view.locked} path={path} />
          ) : undefined
        }
      />

      {view.posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          path={path}
          hidden={post.isHidden}
          canEdit={post.author?.id === user.id}
          canRemove={post.author?.id === user.id || isAdmin}
        />
      ))}

      {pages > 1 && (
        <nav className="fo-pager" aria-label="Pagination">
          {current > 1 && (
            <Link href={`${path}?page=${String(current - 1)}`} className="fo-btn">
              ← Précédent
            </Link>
          )}
          <span className="fo-hint" style={{ alignSelf: "center" }}>
            page {current} / {pages}
          </span>
          {current < pages && (
            <Link href={`${path}?page=${String(current + 1)}`} className="fo-btn">
              Suivant →
            </Link>
          )}
        </nav>
      )}

      {/* A closed thread keeps its messages and loses its box: the alternative
          is a form that accepts input and then refuses it. */}
      {view.locked ? (
        <div className="fo-empty" style={{ marginTop: 24 }}>
          Ce sujet est fermé. Il reste lisible, mais on n&apos;y répond plus.
        </div>
      ) : (
        <ReplyBox topicId={view.id} />
      )}
    </div>
  );
}
