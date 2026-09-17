import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

/**
 * The forum.
 *
 * One forum for the whole platform rather than one per class, because the
 * question a first-year has about subnetting is the same question next year's
 * first-year will have, and a class forum throws that away every September.
 *
 * A thread's opening message is an ordinary post rather than a column on the
 * topic. Editing, hiding and screening then have one code path instead of two
 * that drift, and "the first post" is simply the oldest one.
 */

const AUTHOR = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  level: true,
  role: true,
} as const;

/** How many replies come back with a thread. Long threads paginate. */
export const POSTS_PER_PAGE = 30;
/** How many threads a section shows at once. */
export const TOPICS_PER_PAGE = 25;

export interface ForumAuthor {
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  role: string;
}

export interface ForumCategorySummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  accent: string;
  topicCount: number;
  lastPostAt: Date | null;
}

export interface ForumTopicSummary {
  id: string;
  slug: string;
  title: string;
  pinned: boolean;
  locked: boolean;
  replyCount: number;
  createdAt: Date;
  lastPostAt: Date;
  categorySlug: string;
  categoryName: string;
  categoryAccent: string;
  author: ForumAuthor | null;
  /** First line or so of the opening post, for the list. */
  preview: string;
}

export interface ForumPostView {
  id: string;
  content: string;
  createdAt: Date;
  editedAt: Date | null;
  /** True only for a row the viewer is allowed to see anyway - their own. */
  isHidden: boolean;
  author: ForumAuthor | null;
}

export interface ForumTopicView extends ForumTopicSummary {
  posts: ForumPostView[];
  /** Total posts including the opening one, for paging. */
  postCount: number;
}

export type ForumWriteResult =
  | { ok: true; id: string; slug?: string; eventId: string | null }
  | { ok: false; reason: "NOT_FOUND" | "LOCKED" | "FORBIDDEN" | "EMPTY" };

/**
 * A URL-safe slug from a title, French accents folded rather than dropped -
 * "Réseau" must not become "rseau".
 */
export function slugify(title: string): string {
  const base = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 60);
  // A title of nothing but punctuation still needs an address.
  return base === "" ? "sujet" : base;
}

function toAuthor(
  user: {
    id: string;
    username: string | null;
    displayName: string;
    avatarUrl: string | null;
    level: number;
    role: string;
  } | null,
): ForumAuthor | null {
  return user;
}

/** First line of a post, for a list that has no room for the rest. */
function preview(content: string, max = 160): string {
  const flat = content
    .replace(/```[\s\S]*?```/gu, " ")
    .replace(/[#>*_`~[\]()!]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}

/** What a reader may see: everything not hidden, plus their own hidden rows. */
function visibleTopics(viewerId: string): Prisma.ForumTopicWhereInput {
  return { OR: [{ isHidden: false }, { authorId: viewerId }] };
}

export const forumRepository = {
  /** The front page: every section, with how busy it is. */
  async listCategories(viewerId: string): Promise<ForumCategorySummary[]> {
    const rows = await prisma.forumCategory.findMany({
      orderBy: { position: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        accent: true,
        _count: { select: { topics: { where: visibleTopics(viewerId) } } },
        topics: {
          where: visibleTopics(viewerId),
          orderBy: { lastPostAt: "desc" },
          take: 1,
          select: { lastPostAt: true },
        },
      },
    });
    return rows.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      accent: c.accent,
      topicCount: c._count.topics,
      lastPostAt: c.topics[0]?.lastPostAt ?? null,
    }));
  },

  /** The most recent activity across every section, for the front page. */
  async listRecentTopics(viewerId: string, limit = 8): Promise<ForumTopicSummary[]> {
    const rows = await prisma.forumTopic.findMany({
      where: visibleTopics(viewerId),
      orderBy: { lastPostAt: "desc" },
      take: limit,
      select: TOPIC_SUMMARY_SELECT,
    });
    return rows.map(toTopicSummary);
  },

  /** One section's threads: pinned first, then by most recent activity. */
  async listTopics(
    categorySlug: string,
    viewerId: string,
    page = 1,
  ): Promise<{
    category: ForumCategorySummary;
    topics: ForumTopicSummary[];
    total: number;
  } | null> {
    const category = await prisma.forumCategory.findUnique({
      where: { slug: categorySlug },
      select: { id: true, slug: true, name: true, description: true, accent: true },
    });
    if (!category) return null;

    const where = { categoryId: category.id, ...visibleTopics(viewerId) };
    const [rows, total] = await Promise.all([
      prisma.forumTopic.findMany({
        where,
        orderBy: [{ pinned: "desc" }, { lastPostAt: "desc" }],
        skip: (page - 1) * TOPICS_PER_PAGE,
        take: TOPICS_PER_PAGE,
        select: TOPIC_SUMMARY_SELECT,
      }),
      prisma.forumTopic.count({ where }),
    ]);

    return {
      category: { ...category, topicCount: total, lastPostAt: rows[0]?.lastPostAt ?? null },
      topics: rows.map(toTopicSummary),
      total,
    };
  },

  /**
   * Just the title, for the browser tab.
   *
   * Separate from findTopic because the metadata pass has no viewer to scope
   * by - and passing an empty string as one would compare "" against a uuid
   * column, which Postgres refuses outright.
   */
  async findTopicTitle(categorySlug: string, topicSlug: string): Promise<string | null> {
    const row = await prisma.forumTopic.findFirst({
      where: { slug: topicSlug, isHidden: false, category: { slug: categorySlug } },
      select: { title: true },
    });
    return row?.title ?? null;
  },

  /** One thread, with a page of its posts. */
  async findTopic(
    categorySlug: string,
    topicSlug: string,
    viewerId: string,
    page = 1,
  ): Promise<ForumTopicView | null> {
    const topic = await prisma.forumTopic.findFirst({
      where: {
        slug: topicSlug,
        category: { slug: categorySlug },
        ...visibleTopics(viewerId),
      },
      select: TOPIC_SUMMARY_SELECT,
    });
    if (!topic) return null;

    // The author's own hidden post stays visible to them, so a removal is not
    // a message that simply vanished with no explanation.
    const postWhere = {
      topicId: topic.id,
      OR: [{ isHidden: false }, { authorId: viewerId }],
    };
    const [posts, postCount] = await Promise.all([
      prisma.forumPost.findMany({
        where: postWhere,
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * POSTS_PER_PAGE,
        take: POSTS_PER_PAGE,
        select: {
          id: true,
          content: true,
          createdAt: true,
          editedAt: true,
          isHidden: true,
          author: { select: AUTHOR },
        },
      }),
      prisma.forumPost.count({ where: postWhere }),
    ]);

    return {
      ...toTopicSummary(topic),
      postCount,
      posts: posts.map((p) => ({
        id: p.id,
        content: p.content,
        createdAt: p.createdAt,
        editedAt: p.editedAt,
        isHidden: p.isHidden,
        author: toAuthor(p.author),
      })),
    };
  },

  /**
   * Opens a thread. The caller screens the text first; this writes it.
   *
   * The slug is derived from the title and made unique inside the section,
   * because two people opening "Présentation" in the same section is normal and
   * losing the second one to a constraint is not.
   */
  async createTopic(input: {
    categorySlug: string;
    authorId: string;
    title: string;
    content: string;
  }): Promise<{ id: string; slug: string } | null> {
    const category = await prisma.forumCategory.findUnique({
      where: { slug: input.categorySlug },
      select: { id: true },
    });
    if (!category) return null;

    const base = slugify(input.title);
    const taken = await prisma.forumTopic.findMany({
      where: { categoryId: category.id, slug: { startsWith: base } },
      select: { slug: true },
    });
    const used = new Set(taken.map((t) => t.slug));
    let slug = base;
    for (let n = 2; used.has(slug); n += 1) slug = `${base}-${String(n)}`;

    const topic = await prisma.forumTopic.create({
      data: {
        categoryId: category.id,
        authorId: input.authorId,
        title: input.title,
        slug,
        posts: { create: { authorId: input.authorId, content: input.content } },
      },
      select: { id: true, slug: true },
    });
    return topic;
  },

  /**
   * Adds a reply and moves the thread up.
   *
   * The count and the timestamp are updated in the same transaction as the
   * insert: they are what every list orders by, and a reply that is written
   * without them is a reply nobody sees.
   */
  async reply(input: {
    topicId: string;
    authorId: string;
    content: string;
  }): Promise<{ postId: string; notify: string[]; topicTitle: string; url: string } | null> {
    const topic = await prisma.forumTopic.findFirst({
      where: { id: input.topicId, isHidden: false, lockedAt: null },
      select: {
        id: true,
        title: true,
        slug: true,
        authorId: true,
        category: { select: { slug: true } },
      },
    });
    if (!topic) return null;

    const now = new Date();
    const post = await prisma.$transaction(async (tx) => {
      const created = await tx.forumPost.create({
        data: { topicId: topic.id, authorId: input.authorId, content: input.content },
        select: { id: true },
      });
      await tx.forumTopic.update({
        where: { id: topic.id },
        data: { lastPostAt: now, replyCount: { increment: 1 } },
      });
      return created;
    });

    // Everyone who has spoken in the thread, plus whoever opened it, minus the
    // person who just replied. A forum where only the opener is told is a forum
    // where a conversation between two other people goes unnoticed by both.
    const participants = await prisma.forumPost.findMany({
      where: { topicId: topic.id, authorId: { not: null }, isHidden: false },
      select: { authorId: true },
      distinct: ["authorId"],
    });
    const notify = [
      ...new Set(
        [...participants.map((p) => p.authorId), topic.authorId].filter(
          (id): id is string => id !== null && id !== input.authorId,
        ),
      ),
    ];

    return {
      postId: post.id,
      notify,
      topicTitle: topic.title,
      url: `/forum/${topic.category.slug}/${topic.slug}`,
    };
  },

  /** Rewrites a post, and says so. Only its author may. */
  async editPost(authorId: string, postId: string, content: string): Promise<boolean> {
    const res = await prisma.forumPost.updateMany({
      where: { id: postId, authorId, isHidden: false },
      data: { content, editedAt: new Date() },
    });
    return res.count > 0;
  },

  /**
   * Takes a post out of the thread.
   *
   * Hidden rather than deleted: a moderator has to be able to see what was
   * removed and why, and a thread full of holes with no rows behind them
   * cannot be reviewed at all. Hiding the opening post hides the thread, since
   * a thread whose question is gone is not a thread.
   */
  async hidePost(postId: string, actor: { id: string; isAdmin: boolean }): Promise<boolean> {
    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, topicId: true, createdAt: true },
    });
    if (!post) return false;
    if (!actor.isAdmin && post.authorId !== actor.id) return false;

    const first = await prisma.forumPost.findFirst({
      where: { topicId: post.topicId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.forumPost.update({ where: { id: post.id }, data: { isHidden: true } });
      if (first?.id === post.id) {
        await tx.forumTopic.update({ where: { id: post.topicId }, data: { isHidden: true } });
      } else {
        await tx.forumTopic.update({
          where: { id: post.topicId },
          data: { replyCount: { decrement: 1 } },
        });
      }
    });
    return true;
  },

  /** Closes or reopens a thread. Administrators only. */
  async setLocked(topicId: string, locked: boolean): Promise<void> {
    await prisma.forumTopic.update({
      where: { id: topicId },
      data: { lockedAt: locked ? new Date() : null },
    });
  },

  /** Holds a thread at the top of its section, or lets it go. Administrators only. */
  async setPinned(topicId: string, pinned: boolean): Promise<void> {
    await prisma.forumTopic.update({ where: { id: topicId }, data: { pinned } });
  },
};

const TOPIC_SUMMARY_SELECT = {
  id: true,
  slug: true,
  title: true,
  pinned: true,
  lockedAt: true,
  replyCount: true,
  createdAt: true,
  lastPostAt: true,
  category: { select: { slug: true, name: true, accent: true } },
  author: { select: AUTHOR },
  posts: {
    orderBy: { createdAt: "asc" },
    take: 1,
    select: { content: true },
  },
} satisfies Prisma.ForumTopicSelect;

function toTopicSummary(row: {
  id: string;
  slug: string;
  title: string;
  pinned: boolean;
  lockedAt: Date | null;
  replyCount: number;
  createdAt: Date;
  lastPostAt: Date;
  category: { slug: string; name: string; accent: string };
  author: {
    id: string;
    username: string | null;
    displayName: string;
    avatarUrl: string | null;
    level: number;
    role: string;
  } | null;
  posts: { content: string }[];
}): ForumTopicSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    pinned: row.pinned,
    locked: row.lockedAt !== null,
    replyCount: row.replyCount,
    createdAt: row.createdAt,
    lastPostAt: row.lastPostAt,
    categorySlug: row.category.slug,
    categoryName: row.category.name,
    categoryAccent: row.category.accent,
    author: toAuthor(row.author),
    preview: preview(row.posts[0]?.content ?? ""),
  };
}
