import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { forumRepository } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { ForumHeader, TopicRow, accentStyle, formatDate } from "./_components/forum-bits";
import "./forum.css";

export const metadata: Metadata = { title: "Forum" };
export const dynamic = "force-dynamic";

export default async function ForumPage(): Promise<React.JSX.Element> {
  const user = await requireRequestUser();
  const [categories, recent] = await Promise.all([
    forumRepository.listCategories(user.id),
    forumRepository.listRecentTopics(user.id),
  ]);

  return (
    <div className="fo-page">
      <ForumHeader
        eyebrow="Cyber Learn · Communauté"
        title={
          <>
            Le <em>forum</em>
          </>
        }
        lede="Une question sur une leçon, un outil à partager, un lab qui ne veut pas démarrer : c'est ici, et c'est lu par tout le monde plutôt que par une seule classe."
      />

      <div className="fo-grid">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/forum/${c.slug}`}
            className="fo-cat"
            style={accentStyle(c.accent)}
          >
            <h2>{c.name}</h2>
            <p>{c.description}</p>
            <span className="fo-cat-meta">
              <span>
                {c.topicCount} sujet{c.topicCount > 1 ? "s" : ""}
              </span>
              {/* An empty section says so rather than showing a date it does
                  not have. */}
              <span>{c.lastPostAt ? formatDate(c.lastPostAt) : "rien encore"}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="fo-section-head">
        <h2>Derniers messages</h2>
      </div>
      {recent.length === 0 ? (
        <div className="fo-empty">
          Personne n&apos;a encore écrit. Ouvre le premier sujet dans une section ci-dessus.
        </div>
      ) : (
        <ul className="fo-list">
          {recent.map((t) => (
            <TopicRow key={t.id} topic={t} />
          ))}
        </ul>
      )}
    </div>
  );
}
