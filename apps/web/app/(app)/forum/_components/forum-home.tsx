import React from "react";
import Link from "next/link";
import type { ForumCategorySummary, ForumTopicSummary } from "@cyberlearn/db";
import { BastionLogo } from "@/components/bastion-logo";
import { TopicRow, authorIsFriend } from "./forum-bits";

export function ForumHome({
  categories,
  recent,
  friends,
}: {
  categories: readonly ForumCategorySummary[];
  recent: readonly ForumTopicSummary[];
  friends: ReadonlySet<string>;
}): React.JSX.Element {
  const totalTopics = categories.reduce((total, category) => total + category.topicCount, 0);

  return (
    <div className="fo-page fo-home learning-catalogue learning-workspace community-workspace">
      <header className="forum-home-head">
        <div>
          <p className="forum-home-kicker">Communauté / L’espace de discussion</p>
          <h1>
            Le forum<span aria-hidden="true">.</span>
          </h1>
          <p className="forum-home-intro">Un blocage, une découverte, une idée à partager.</p>
        </div>
        {categories.length > 0 && (
          <details className="forum-home-compose">
            <summary>
              Nouveau sujet <span aria-hidden="true">+</span>
            </summary>
            <div className="forum-home-compose__choices">
              <p>Dans quelle section ?</p>
              <ul>
                {categories.map((category) => (
                  <li key={category.id}>
                    <Link href={`/forum/${category.slug}?compose=1`}>{category.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        )}
      </header>

      <div className="forum-home-ledger">
        <span>
          <b>{totalTopics}</b> sujet{totalTopics > 1 ? "s" : ""}
        </span>
        <span>
          <b>{categories.length}</b> section{categories.length > 1 ? "s" : ""}
        </span>
        <p>Ouvert à toutes les classes</p>
      </div>

      <div className="forum-home-board">
        <section className="forum-home-feed" aria-labelledby="forum-recent">
          <div className="forum-home-section-head">
            <h2 id="forum-recent">Derniers échanges</h2>
            <span>Les discussions récentes</span>
          </div>
          {recent.length > 0 ? (
            <ul className="fo-list forum-home-topics">
              {recent.map((topic, index) => (
                <TopicRow
                  key={topic.id}
                  topic={topic}
                  isFriend={authorIsFriend(topic.author, friends)}
                  featured={index === 0}
                />
              ))}
            </ul>
          ) : (
            <div className="forum-home-empty">
              <BastionLogo size={48} />
              <h3>La première discussion reste à écrire.</h3>
              <p>Choisis une section pour poser ta question ou partager ce que tu as appris.</p>
              {categories[0] && (
                <Link className="btn" href={`/forum/${categories[0].slug}?compose=1`}>
                  Ouvrir un sujet
                </Link>
              )}
            </div>
          )}
          <aside className="forum-home-context" aria-label="Conseil de rédaction">
            <span aria-hidden="true">?</span>
            <div>
              <h3>Donne du contexte.</h3>
              <p>
                Ce que tu veux faire, ce que tu as essayé, le résultat obtenu : de quoi aider les
                autres à te répondre.
              </p>
            </div>
          </aside>
        </section>

        <nav className="forum-home-directory" aria-labelledby="forum-sections">
          <div className="forum-home-section-head">
            <h2 id="forum-sections">Les sections</h2>
            <span>Choisis ton terrain</span>
          </div>
          <ol>
            {categories.map((category, index) => (
              <li key={category.id}>
                <Link href={`/forum/${category.slug}`}>
                  <span className="forum-home-directory__index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="forum-home-directory__name">{category.name}</span>
                  <span className="forum-home-directory__count">
                    <b>{category.topicCount}</b>
                    <span>sujet{category.topicCount > 1 ? "s" : ""}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          {categories.length === 0 && (
            <p className="forum-home-unavailable">Les sections ne sont pas encore disponibles.</p>
          )}
          <div className="forum-home-signature">
            <BastionLogo size={32} />
            <p>
              Code, sécurité, réseau.
              <br />
              Les échanges continuent ici.
            </p>
          </div>
        </nav>
      </div>
    </div>
  );
}
