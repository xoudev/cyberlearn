import React from "react";
import Link from "next/link";
import type { ContentAuthor, ModeratedContent, ReviewableContent } from "@cyberlearn/db";
import { contentExcerpt } from "@/lib/content-moderation";
import { learnerUrl } from "@/lib/learner-url";
import { Tag } from "../../_components/admin-ui";

/**
 * How the content list and the reports draw one piece of content and its
 * author: the text as written, where it lives, and the account one click
 * away, its bans and history in view.
 */

/**
 * The page on the learner site, or null when the deployment points that
 * address at the console itself (learnerUrl refuses it): the place is still
 * named, without a link nobody could follow.
 */
function learnerHref(path: string): string | null {
  try {
    return learnerUrl(path);
  } catch {
    return null;
  }
}

export function ContentPlace({ content }: { content: ModeratedContent }): React.ReactElement {
  if (content.consolePath !== null) {
    return (
      <Link href={content.consolePath} style={{ color: "var(--a-accent)" }}>
        {content.context}
      </Link>
    );
  }
  const href = content.learnerPath === null ? null : learnerHref(content.learnerPath);
  return href === null ? (
    <span>{content.context}</span>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--a-accent)" }}>
      {content.context} ↗
    </a>
  );
}

/** The text, cut for a row; whole in a report, where it is the evidence. */
export function ContentText({
  content,
  whole = false,
}: {
  content: ModeratedContent;
  whole?: boolean;
}): React.ReactElement {
  return whole ? (
    // As written, not rendered: a reviewer judges the text, not its markup.
    <pre className="a-mod-excerpt">{content.text.trim() === "" ? "(vide)" : content.text}</pre>
  ) : (
    <span style={{ whiteSpace: "normal" }}>{contentExcerpt(content.text)}</span>
  );
}

export function AuthorLink({ author }: { author: ContentAuthor | null }): React.ReactElement {
  if (author === null) return <span style={{ color: "var(--a-muted)" }}>Compte supprimé</span>;
  return (
    <Link href={`/users/${author.id}`} className="a-row-link">
      <span style={{ display: "grid", gap: 2 }}>
        <span className="a-row-link-title">{author.displayName}</span>
        {author.username !== null && (
          <span className="mono" style={{ color: "var(--a-muted)", fontSize: 11 }}>
            @{author.username}
          </span>
        )}
      </span>
    </Link>
  );
}

/**
 * Where a piece of content stands: visible, hidden, or withdrawn by its
 * author, which the console cannot undo. A message the filter still holds
 * reads as hidden: the queue decides it, and the actions say so.
 */
export function ContentState({
  content,
  hiddenLabel = "Masqué",
}: {
  content: ReviewableContent;
  hiddenLabel?: string;
}): React.ReactElement {
  if (!content.isHidden) return <Tag tone="accent">Visible</Tag>;
  return content.authorWithdrew && !content.pendingReview ? (
    <Tag>Retiré par l&apos;auteur</Tag>
  ) : (
    <Tag tone="danger">{hiddenLabel}</Tag>
  );
}
