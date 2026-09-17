import React from "react";
import Link from "next/link";
import type { ForumAuthor, ForumTopicSummary } from "@cyberlearn/db";

/** Shared pieces of the forum's chrome, so four pages cannot drift apart. */

/**
 * A section's colour lives in the database, so it reaches the stylesheet as a
 * custom property rather than as a class. Typed here once instead of asserted
 * at each use.
 */
export function accentStyle(accent: string | undefined): React.CSSProperties | undefined {
  if (accent === undefined) return undefined;
  const style: Record<string, string> = { "--fo-accent": accent };
  return style;
}

export function ForumHeader({
  eyebrow,
  title,
  accent,
  lede,
  actions,
}: {
  eyebrow: string;
  title: React.ReactNode;
  accent?: string;
  lede?: string;
  actions?: React.ReactNode;
}): React.JSX.Element {
  return (
    <header style={accentStyle(accent)}>
      <div className="fo-eyebrow">{eyebrow}</div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <h1 className="fo-title">{title}</h1>
        {/* Pushed to the right edge so that a long title, which wraps the
            actions onto their own line, does not leave them looking like the
            first thing in the thread. */}
        {actions !== undefined && <div style={{ marginLeft: "auto" }}>{actions}</div>}
      </div>
      {lede !== undefined && <p className="fo-lede">{lede}</p>}
    </header>
  );
}

export function Crumbs({
  trail,
}: {
  trail: { label: string; href?: string }[];
}): React.JSX.Element {
  return (
    <nav className="fo-crumb" aria-label="Fil d'ariane">
      {trail.map((step, i) => (
        <React.Fragment key={step.label}>
          {i > 0 && <span aria-hidden="true">/</span>}
          {step.href === undefined ? (
            <span aria-current="page">{step.label}</span>
          ) : (
            <Link href={step.href}>{step.label}</Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

/** A name that is never empty, whoever is left after an anonymisation. */
export function authorName(author: ForumAuthor | null): string {
  if (!author) return "Compte supprimé";
  return author.displayName.trim() !== "" ? author.displayName : (author.username ?? "Sans nom");
}

export function Monogram({ author }: { author: ForumAuthor | null }): React.JSX.Element {
  const name = authorName(author);
  if (author?.avatarUrl != null && author.avatarUrl !== "") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={author.avatarUrl} alt="" width={46} height={46} />;
  }
  return (
    <span className="fo-post-monogram" aria-hidden="true">
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Dates are rendered on the server and in one timezone, so they cannot
 *  disagree between the server pass and the client one. */
export function formatDate(value: Date | string): string {
  return DATE_FMT.format(typeof value === "string" ? new Date(value) : value);
}

export function TopicRow({
  topic,
  showCategory = true,
}: {
  topic: ForumTopicSummary;
  /** Off inside a section, where naming it on every row says nothing. */
  showCategory?: boolean;
}): React.JSX.Element {
  return (
    <li>
      <Link
        href={`/forum/${topic.categorySlug}/${topic.slug}`}
        className="fo-topic"
        style={accentStyle(topic.categoryAccent)}
      >
        <span style={{ minWidth: 0 }}>
          <span className="fo-topic-title">
            {topic.pinned && <span className="fo-tag fo-tag--pinned">Épinglé</span>}
            {topic.locked && <span className="fo-tag fo-tag--locked">Fermé</span>}
            {topic.title}
          </span>
          <p className="fo-topic-preview">{topic.preview}</p>
          <div className="fo-topic-meta">
            {showCategory && <>{topic.categoryName} · </>}
            ouvert par {authorName(topic.author)} · dernier message {formatDate(topic.lastPostAt)}
          </div>
        </span>
        <span className="fo-topic-count">
          <strong>{topic.replyCount}</strong>
          <span>réponse{topic.replyCount > 1 ? "s" : ""}</span>
        </span>
      </Link>
    </li>
  );
}
