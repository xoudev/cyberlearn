import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TOPICS_PER_PAGE, forumRepository } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { Crumbs, ForumHeader, TopicRow } from "../_components/forum-bits";
import "../forum.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  return { title: `Forum · ${category}` };
}

export default async function ForumCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string }>;
}): Promise<React.JSX.Element> {
  const user = await requireRequestUser();
  const { category } = await params;
  const { page } = await searchParams;
  const current = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);

  const data = await forumRepository.listTopics(category, user.id, current);
  if (!data) notFound();

  const pages = Math.max(1, Math.ceil(data.total / TOPICS_PER_PAGE));

  return (
    <div className="fo-page">
      <Crumbs trail={[{ label: "Forum", href: "/forum" }, { label: data.category.name }]} />
      <ForumHeader
        eyebrow={`${String(data.total)} sujet${data.total > 1 ? "s" : ""}`}
        title={data.category.name}
        accent={data.category.accent}
        lede={data.category.description}
        actions={
          <Link href={`/forum/${category}/nouveau`} className="fo-btn fo-btn--primary">
            Nouveau sujet
          </Link>
        }
      />

      {data.topics.length === 0 ? (
        <div className="fo-empty">
          Cette section est vide. Le premier sujet est souvent le plus lu — ouvre-le.
        </div>
      ) : (
        <ul className="fo-list">
          {data.topics.map((t) => (
            <TopicRow key={t.id} topic={t} showCategory={false} />
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className="fo-pager" aria-label="Pagination">
          {current > 1 && (
            <Link href={`/forum/${category}?page=${String(current - 1)}`} className="fo-btn">
              ← Précédent
            </Link>
          )}
          <span className="fo-hint" style={{ alignSelf: "center" }}>
            page {current} / {pages}
          </span>
          {current < pages && (
            <Link href={`/forum/${category}?page=${String(current + 1)}`} className="fo-btn">
              Suivant →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
