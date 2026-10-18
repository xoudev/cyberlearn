import type {
  ForumAuthor,
  ForumCategorySummary,
  ForumPostView,
  ForumTopicSummary,
} from "@cyberlearn/db";
import { forumAuthorHandle, forumAuthorName } from "@/lib/forum/author-name";

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
  /**
   * One of the reader's friends, marked beside the name as on the site. A
   * forum author is always named, so the mark hides nothing.
   */
  isFriend: boolean;
}

/** No friends to mark: what a caller that does not read them passes. */
const NO_FRIENDS: ReadonlySet<string> = new Set();

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
  /**
   * The handle the author's name opens a profile with, or null when the
   * reader would not be let in: the same names are links as on the site.
   */
  authorHandle: string | null;
}

function toMobileAuthor(
  author: ForumAuthor | null,
  friends: ReadonlySet<string>,
): MobileForumAuthor | null {
  if (!author) return null;
  return {
    id: author.id,
    name: forumAuthorName(author),
    level: author.level,
    role: author.role,
    isFriend: friends.has(author.id),
  };
}

export function toMobileTopicSummary(
  topic: ForumTopicSummary,
  /** The reader's friends (friendshipRepository.friendIds), marked beside their names. */
  friends: ReadonlySet<string> = NO_FRIENDS,
): MobileForumTopicSummary {
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
    author: toMobileAuthor(topic.author, friends),
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
  /** Whose profile the reader may open (userRepository.profilesOpenTo). */
  openProfiles: ReadonlySet<string>,
  /** The reader's friends (friendshipRepository.friendIds), marked beside their names. */
  friends: ReadonlySet<string> = NO_FRIENDS,
): MobileForumPost {
  return {
    id: post.id,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
    editedAt: post.editedAt?.toISOString() ?? null,
    hidden: post.isHidden,
    mine: post.author?.id === viewerId,
    author: toMobileAuthor(post.author, friends),
    avatar,
    authorHandle: forumAuthorHandle(post.author, openProfiles),
  };
}

/** A page number from a query string: 1 unless it is a positive integer. */
export function pageParam(value: string | null): number {
  const n = Number.parseInt(value ?? "1", 10);
  return Number.isInteger(n) && n > 0 && n < 10_000 ? n : 1;
}
