import type {
  ForumAuthor,
  ForumCategorySummary,
  ForumPostView,
  ForumTopicSummary,
} from "@cyberlearn/db";
import { forumAuthorName } from "@/lib/forum/author-name";

/**
 * The forum as the app receives it (/api/mobile/forum/*): the repository's
 * views, with dates as ISO strings, the author reduced to what the app shows,
 * and the stored avatar value left out. An uploaded avatar's stored value is
 * a storage key, useless without a signature; the thread route sends the
 * signed one instead, for the authors on that page only.
 */

export interface MobileForumAuthor {
  id: string;
  name: string;
  level: number;
  /** "TEACHER" and "ADMIN" are labelled in the thread, as on the site. */
  role: string;
}

export interface MobileForumTopicSummary {
  id: string;
  slug: string;
  title: string;
  pinned: boolean;
  locked: boolean;
  replyCount: number;
  createdAt: string;
  lastPostAt: string;
  categorySlug: string;
  categoryName: string;
  categoryAccent: string;
  author: MobileForumAuthor | null;
  preview: string;
}

export interface MobileForumPost {
  id: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
  /** Taken down; only ever sent to its own author. */
  hidden: boolean;
  /** Written by the reader: theirs to edit or take down. */
  mine: boolean;
  author: MobileForumAuthor | null;
  /** Ready to draw: a glyph, a preset path, a signed URL, or null. */
  avatar: string | null;
}

export function toMobileAuthor(author: ForumAuthor | null): MobileForumAuthor | null {
  if (!author) return null;
  return {
    id: author.id,
    name: forumAuthorName(author),
    level: author.level,
    role: author.role,
  };
}

export function toMobileTopicSummary(topic: ForumTopicSummary): MobileForumTopicSummary {
  return {
    id: topic.id,
    slug: topic.slug,
    title: topic.title,
    pinned: topic.pinned,
    locked: topic.locked,
    replyCount: topic.replyCount,
    createdAt: topic.createdAt.toISOString(),
    lastPostAt: topic.lastPostAt.toISOString(),
    categorySlug: topic.categorySlug,
    categoryName: topic.categoryName,
    categoryAccent: topic.categoryAccent,
    author: toMobileAuthor(topic.author),
    preview: topic.preview,
  };
}

export function toMobileCategory(category: ForumCategorySummary): {
  slug: string;
  name: string;
  description: string;
  accent: string;
  topicCount: number;
  lastPostAt: string | null;
} {
  return {
    slug: category.slug,
    name: category.name,
    description: category.description,
    accent: category.accent,
    topicCount: category.topicCount,
    lastPostAt: category.lastPostAt?.toISOString() ?? null,
  };
}

export function toMobilePost(
  post: ForumPostView,
  viewerId: string,
  avatar: string | null,
): MobileForumPost {
  return {
    id: post.id,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
    editedAt: post.editedAt?.toISOString() ?? null,
    hidden: post.isHidden,
    mine: post.author?.id === viewerId,
    author: toMobileAuthor(post.author),
    avatar,
  };
}

/** A page number from a query string: 1 unless it is a positive integer. */
export function pageParam(value: string | null): number {
  const n = Number.parseInt(value ?? "1", 10);
  return Number.isInteger(n) && n > 0 && n < 10_000 ? n : 1;
}
