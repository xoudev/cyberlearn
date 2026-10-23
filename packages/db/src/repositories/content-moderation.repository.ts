import type { ContentReportSurface, Prisma } from "@prisma/client";
import { AUDIT_ACTION } from "../audit-actions.js";
import { prisma } from "../prisma.js";
import { LIVE_CLASS_FILTER, classRepository } from "./class.repository.js";
import { readSlice, type ConsolePage, type ConsoleSlice } from "./console-page.js";
import { lessonsVisibleTo } from "./lesson.repository.js";

/**
 * What people publish to each other, as the console moderates it by hand: a
 * forum message, a question or an answer under a lesson, a challenge solution,
 * a class resource. Hidden, shown again, or deleted, from the console's list
 * of contents or from a report about one.
 *
 * The screen's own queue (moderation.repository) decides what the filter
 * flagged; this is the rest: what got through, what somebody reported, what a
 * moderator spotted. Content still waiting in that queue is decided there,
 * not here: a restore from this side would put back a message the queue then
 * destroys, or the other way round.
 *
 * One vocabulary for the surfaces: the database's ContentReportSurface, which
 * names the reports too, so a report leads to its content without a mapping
 * nobody keeps in step.
 */

export const CONTENT_SURFACES = [
  "FORUM_POST",
  "LESSON_QUESTION",
  "LESSON_ANSWER",
  "CHALLENGE_WRITEUP",
  "CLASS_RESOURCE",
] as const satisfies readonly ContentReportSurface[];

export type ContentSurface = (typeof CONTENT_SURFACES)[number];

// Fails to compile when the schema gains a surface this list does not have.
const everySurfaceListed: [Exclude<ContentReportSurface, ContentSurface>] extends [never]
  ? true
  : never = true;
// eslint-disable-next-line @typescript-eslint/no-meaningless-void-operator -- marks the compile-time check as used; it has no runtime value to discard.
void everySurfaceListed;

/** What the journal calls each gesture. */
export const CONTENT_AUDIT_ACTION = AUDIT_ACTION.content;

export type ContentGesture = "hide" | "restore" | "delete";

export interface ContentAuthor {
  id: string;
  username: string | null;
  displayName: string;
}

/** One piece of published content, as the console and the reports read it. */
export interface ModeratedContent {
  surface: ContentSurface;
  id: string;
  /** As written: the title and the body together for a question or a resource. */
  text: string;
  isHidden: boolean;
  createdAt: Date;
  /** Null once the author's account is erased. */
  author: ContentAuthor | null;
  /** Where it lives, in words. */
  context: string;
  /** Its page on the learner site; null for a class resource, which has none of its own. */
  learnerPath: string | null;
  /** Its page in the console, when it has one: a class resource's class. */
  consolePath: string | null;
  /**
   * A forum message that opens its thread. Hiding it hides the thread and
   * deleting it deletes the thread with its replies: a thread whose question
   * is gone is not a thread.
   */
  opensThread: boolean;
  /** The thread of a forum message; null for anything else. */
  threadId: string | null;
  /** The replies that go with a thread's opening message, or a question's answers. */
  replies: number;
  /**
   * A hidden forum message the moderation did not hide: its author withdrew
   * it, and that is final, so the console never shows it again. The screen's
   * holds read the same until their review, and pendingReview, which the
   * console checks first, tells them apart. False everywhere else: the other
   * surfaces are only ever hidden by the screen or by the console.
   */
  authorWithdrew: boolean;
}

/** The content, and whether the screen's queue still holds a decision about it. */
export interface ReviewableContent extends ModeratedContent {
  /** Still in the screen's queue: decided there, not from the console's lists. */
  pendingReview: boolean;
}

/** A row of the console's list: the content, and what is waiting on it. */
export interface ConsoleContentRow extends ReviewableContent {
  /** Open reports about it. */
  openReports: number;
}

export interface ConsoleContentQuery extends ConsolePage {
  surface: ContentSurface;
  /** True for the hidden ones, false for the visible ones, undefined for both. */
  hidden: boolean | undefined;
  /** Searched in the text, where it lives and the author's names. */
  q: string;
  /**
   * Only what this account wrote: the account itself, not a search on its
   * name, which also finds other people's messages that quote or resemble it.
   */
  authorId?: string | undefined;
}

export interface ContentNotice {
  title: string;
  body: string;
}

export type ContentGestureResult =
  | { ok: true; content: ModeratedContent; reportsClosed: number }
  | { ok: false; reason: "NOT_FOUND" | "UNCHANGED" | "PENDING_REVIEW" | "AUTHOR_WITHDRAWN" };

type Db = Prisma.TransactionClient;

/** A row removed by a deletion, its own or by the cascade: its reports are closed. */
export interface RemovedRow {
  surface: ContentSurface;
  id: string;
}

/**
 * Closes, as DELETED, the open reports about rows a deletion took, in the
 * deletion's own transaction: the console's, and the screen's queue when it
 * destroys what it held. How many it closed.
 *
 * Without it a report outlives its content: the sidebar counts it, and the
 * report queue says its author or a teacher removed it, which nobody did.
 */
export async function closeReportsOfRemoved(
  db: Db,
  removed: readonly RemovedRow[],
  actorId: string,
  now: Date = new Date(),
): Promise<number> {
  let closed = 0;
  for (const surface of CONTENT_SURFACES) {
    const ids = removed.filter((r) => r.surface === surface).map((r) => r.id);
    if (ids.length === 0) continue;
    const { count } = await db.contentReport.updateMany({
      where: { surface, contentId: { in: ids }, status: "OPEN" },
      data: { status: "DELETED", resolvedAt: now, resolvedById: actorId },
    });
    closed += count;
  }
  return closed;
}

const AUTHOR = { select: { id: true, username: true, displayName: true } } as const;

const contains = (q: string): Prisma.StringFilter => ({ contains: q, mode: "insensitive" });

function authorMatches(q: string): Prisma.UserWhereInput {
  return { OR: [{ username: contains(q) }, { displayName: contains(q) }] };
}

function hiddenFilter(hidden: boolean | undefined): { isHidden?: boolean } {
  return hidden === undefined ? {} : { isHidden: hidden };
}

/** Whether the screen's queue still holds a decision about any of these rows. */
async function pendingIn(db: Db, contentIds: string[]): Promise<Set<string>> {
  if (contentIds.length === 0) return new Set();
  const rows = await db.moderationEvent.findMany({
    where: { contentId: { in: contentIds }, outcome: "PENDING" },
    select: { contentId: true },
  });
  return new Set(rows.flatMap((r) => (r.contentId === null ? [] : [r.contentId])));
}

/** These contents, each with whether the screen's queue still holds it. */
async function withPending(
  db: Db,
  handler: SurfaceHandler,
  contents: ModeratedContent[],
): Promise<ReviewableContent[]> {
  const pending = await pendingIn(
    db,
    contents.flatMap((content) => handler.reviewIds(content)),
  );
  return contents.map((content) => ({
    ...content,
    pendingReview: handler.reviewIds(content).some((id) => pending.has(id)),
  }));
}

/**
 * Puts a thread's reply count back to what is under it: the visible messages
 * after the opening one.
 *
 * Counted rather than nudged up or down, because the paths that hide a reply
 * do not agree on it: a reply the screen held never counted, an edit the
 * screen took down still does. A count read from the rows cannot drift.
 */
export async function recountForumReplies(db: Db, topicId: string): Promise<void> {
  const first = await db.forumPost.findFirst({
    where: { topicId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const replies =
    first === null
      ? 0
      : await db.forumPost.count({ where: { topicId, isHidden: false, id: { not: first.id } } });
  await db.forumTopic.updateMany({ where: { id: topicId }, data: { replyCount: replies } });
}

// ─── Per surface ────────────────────────────────────────────────────────────

interface SurfaceHandler {
  /** The rows of these ids that still exist. */
  read(db: Db, ids: string[]): Promise<ModeratedContent[]>;
  count(where: ConsoleContentQuery): Promise<number>;
  list(
    where: ConsoleContentQuery,
    window: { skip: number; take: number },
  ): Promise<ModeratedContent[]>;
  /** True when the row changed. */
  setHidden(db: Db, id: string, hidden: boolean): Promise<boolean>;
  /** What went: nothing when the row was already gone. */
  destroy(db: Db, id: string): Promise<RemovedRow[]>;
  /** The author, when this viewer can see the content; null when they cannot. */
  reportable(viewerId: string, id: string): Promise<{ authorId: string | null } | null>;
  /** The ids of the rows this account wrote, hidden or not. */
  authoredBy(userId: string): Promise<string[]>;
  /** The ids a pending decision of the screen may be attached to. */
  reviewIds(content: ModeratedContent): string[];
}

// ── Forum messages ─────────────────────────────────────────────────────────

const FORUM_POST_SELECT = {
  id: true,
  content: true,
  isHidden: true,
  hiddenByModeration: true,
  createdAt: true,
  author: AUTHOR,
  topic: {
    select: {
      id: true,
      title: true,
      slug: true,
      replyCount: true,
      category: { select: { slug: true } },
      posts: { orderBy: { createdAt: "asc" }, take: 1, select: { id: true } },
    },
  },
} satisfies Prisma.ForumPostSelect;

type ForumPostRow = Prisma.ForumPostGetPayload<{ select: typeof FORUM_POST_SELECT }>;

function forumPostContent(row: ForumPostRow): ModeratedContent {
  const opensThread = row.topic.posts[0]?.id === row.id;
  return {
    surface: "FORUM_POST",
    id: row.id,
    text: row.content,
    isHidden: row.isHidden,
    createdAt: row.createdAt,
    author: row.author,
    context: `${opensThread ? "Ouvre le sujet" : "Dans le sujet"} « ${row.topic.title} »`,
    learnerPath: `/forum/${row.topic.category.slug}/${row.topic.slug}`,
    consolePath: null,
    opensThread,
    threadId: row.topic.id,
    replies: opensThread ? row.topic.replyCount : 0,
    authorWithdrew: row.isHidden && !row.hiddenByModeration,
  };
}

function forumPostWhere(query: ConsoleContentQuery): Prisma.ForumPostWhereInput {
  return {
    ...hiddenFilter(query.hidden),
    ...(query.authorId !== undefined && { authorId: query.authorId }),
    ...(query.q !== "" && {
      OR: [
        { content: contains(query.q) },
        { topic: { title: contains(query.q) } },
        { author: authorMatches(query.q) },
      ],
    }),
  };
}

/** The topic of a forum message, and whether that message opens it. */
async function forumPlace(
  db: Db,
  id: string,
): Promise<{ topicId: string; opensThread: boolean; isHidden: boolean } | null> {
  const post = await db.forumPost.findUnique({
    where: { id },
    select: { topicId: true, isHidden: true },
  });
  if (post === null) return null;
  const first = await db.forumPost.findFirst({
    where: { topicId: post.topicId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return { topicId: post.topicId, opensThread: first?.id === id, isHidden: post.isHidden };
}

const forumPostHandler: SurfaceHandler = {
  async read(db, ids) {
    const rows = await db.forumPost.findMany({
      where: { id: { in: ids } },
      select: FORUM_POST_SELECT,
    });
    return rows.map(forumPostContent);
  },
  count: (query) => prisma.forumPost.count({ where: forumPostWhere(query) }),
  async list(query, window) {
    const rows = await prisma.forumPost.findMany({
      where: forumPostWhere(query),
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      ...window,
      select: FORUM_POST_SELECT,
    });
    return rows.map(forumPostContent);
  },
  async setHidden(db, id, hidden) {
    const place = await forumPlace(db, id);
    if (place === null || place.isHidden === hidden) return false;
    // Marked as the moderation's when hidden, and shown again only when it
    // is, in the same statement: a message its author withdrew stays down.
    const { count } = await db.forumPost.updateMany({
      where: hidden ? { id, isHidden: false } : { id, isHidden: true, hiddenByModeration: true },
      data: { isHidden: hidden, hiddenByModeration: hidden },
    });
    if (count === 0) return false;
    // The opening message carries the thread; a reply moves the count.
    if (place.opensThread) {
      await db.forumTopic.updateMany({ where: { id: place.topicId }, data: { isHidden: hidden } });
    }
    await recountForumReplies(db, place.topicId);
    return true;
  },
  async destroy(db, id) {
    const place = await forumPlace(db, id);
    if (place === null) return [];
    if (place.opensThread) {
      const posts = await db.forumPost.findMany({
        where: { topicId: place.topicId },
        select: { id: true },
      });
      // The thread goes with its question, and its replies by the cascade.
      await db.forumTopic.deleteMany({ where: { id: place.topicId } });
      return posts.map((p) => ({ surface: "FORUM_POST", id: p.id }));
    }
    const { count } = await db.forumPost.deleteMany({ where: { id } });
    if (count === 0) return [];
    await recountForumReplies(db, place.topicId);
    return [{ surface: "FORUM_POST", id }];
  },
  async reportable(_viewerId, id) {
    // The forum is the whole platform's: anybody signed in reads what is up.
    const row = await prisma.forumPost.findFirst({
      where: { id, isHidden: false, topic: { isHidden: false } },
      select: { authorId: true },
    });
    return row === null ? null : { authorId: row.authorId };
  },
  async authoredBy(userId) {
    const rows = await prisma.forumPost.findMany({
      where: { authorId: userId },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  },
  reviewIds(content) {
    // A thread the screen held is recorded against its topic.
    return content.opensThread && content.threadId !== null
      ? [content.id, content.threadId]
      : [content.id];
  },
};

// ── Questions and answers under a lesson ───────────────────────────────────

const QUESTION_SELECT = {
  id: true,
  title: true,
  content: true,
  isHidden: true,
  createdAt: true,
  user: AUTHOR,
  lesson: { select: { title: true, slug: true } },
  _count: { select: { answers: true } },
} satisfies Prisma.LessonQuestionSelect;

type QuestionRow = Prisma.LessonQuestionGetPayload<{ select: typeof QUESTION_SELECT }>;

function questionContent(row: QuestionRow): ModeratedContent {
  return {
    surface: "LESSON_QUESTION",
    id: row.id,
    text: `${row.title}\n\n${row.content}`,
    isHidden: row.isHidden,
    createdAt: row.createdAt,
    author: row.user,
    context: `Leçon « ${row.lesson.title} »`,
    learnerPath: `/lessons/${row.lesson.slug}`,
    consolePath: null,
    opensThread: false,
    threadId: null,
    replies: row._count.answers,
    authorWithdrew: false,
  };
}

function questionWhere(query: ConsoleContentQuery): Prisma.LessonQuestionWhereInput {
  return {
    ...hiddenFilter(query.hidden),
    ...(query.authorId !== undefined && { userId: query.authorId }),
    ...(query.q !== "" && {
      OR: [
        { title: contains(query.q) },
        { content: contains(query.q) },
        { lesson: { title: contains(query.q) } },
        { user: authorMatches(query.q) },
      ],
    }),
  };
}

const lessonQuestionHandler: SurfaceHandler = {
  async read(db, ids) {
    const rows = await db.lessonQuestion.findMany({
      where: { id: { in: ids } },
      select: QUESTION_SELECT,
    });
    return rows.map(questionContent);
  },
  count: (query) => prisma.lessonQuestion.count({ where: questionWhere(query) }),
  async list(query, window) {
    const rows = await prisma.lessonQuestion.findMany({
      where: questionWhere(query),
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      ...window,
      select: QUESTION_SELECT,
    });
    return rows.map(questionContent);
  },
  async setHidden(db, id, hidden) {
    const { count } = await db.lessonQuestion.updateMany({
      where: { id, isHidden: !hidden },
      data: { isHidden: hidden },
    });
    return count > 0;
  },
  async destroy(db, id) {
    const answers = await db.lessonAnswer.findMany({
      where: { questionId: id },
      select: { id: true },
    });
    // Its answers go with it, by the cascade on the foreign key.
    const { count } = await db.lessonQuestion.deleteMany({ where: { id } });
    if (count === 0) return [];
    return [
      { surface: "LESSON_QUESTION", id },
      ...answers.map((a): RemovedRow => ({ surface: "LESSON_ANSWER", id: a.id })),
    ];
  },
  async reportable(viewerId, id) {
    const row = await prisma.lessonQuestion.findFirst({
      where: { id, isHidden: false, lesson: lessonsVisibleTo(viewerId) },
      select: { userId: true },
    });
    return row === null ? null : { authorId: row.userId };
  },
  async authoredBy(userId) {
    const rows = await prisma.lessonQuestion.findMany({
      where: { userId },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  },
  reviewIds: (content) => [content.id],
};

const ANSWER_SELECT = {
  id: true,
  content: true,
  isHidden: true,
  createdAt: true,
  user: AUTHOR,
  question: { select: { title: true, lesson: { select: { title: true, slug: true } } } },
} satisfies Prisma.LessonAnswerSelect;

type AnswerRow = Prisma.LessonAnswerGetPayload<{ select: typeof ANSWER_SELECT }>;

function answerContent(row: AnswerRow): ModeratedContent {
  return {
    surface: "LESSON_ANSWER",
    id: row.id,
    text: row.content,
    isHidden: row.isHidden,
    createdAt: row.createdAt,
    author: row.user,
    context: `Réponse à « ${row.question.title} », leçon « ${row.question.lesson.title} »`,
    learnerPath: `/lessons/${row.question.lesson.slug}`,
    consolePath: null,
    opensThread: false,
    threadId: null,
    replies: 0,
    authorWithdrew: false,
  };
}

function answerWhere(query: ConsoleContentQuery): Prisma.LessonAnswerWhereInput {
  return {
    ...hiddenFilter(query.hidden),
    ...(query.authorId !== undefined && { userId: query.authorId }),
    ...(query.q !== "" && {
      OR: [
        { content: contains(query.q) },
        { question: { title: contains(query.q) } },
        { user: authorMatches(query.q) },
      ],
    }),
  };
}

const lessonAnswerHandler: SurfaceHandler = {
  async read(db, ids) {
    const rows = await db.lessonAnswer.findMany({
      where: { id: { in: ids } },
      select: ANSWER_SELECT,
    });
    return rows.map(answerContent);
  },
  count: (query) => prisma.lessonAnswer.count({ where: answerWhere(query) }),
  async list(query, window) {
    const rows = await prisma.lessonAnswer.findMany({
      where: answerWhere(query),
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      ...window,
      select: ANSWER_SELECT,
    });
    return rows.map(answerContent);
  },
  async setHidden(db, id, hidden) {
    const [answer] = await db.lessonAnswer.updateManyAndReturn({
      where: { id, isHidden: !hidden },
      data: { isHidden: hidden },
      select: { questionId: true, isAccepted: true },
    });
    if (answer === undefined) return false;
    // The accepted answer is what resolves its question: out of sight, the
    // question is open again for its readers, and resolved again with it.
    if (answer.isAccepted) {
      await db.lessonQuestion.updateMany({
        where: { id: answer.questionId },
        data: { isResolved: !hidden },
      });
    }
    return true;
  },
  async destroy(db, id) {
    const answer = await db.lessonAnswer.findUnique({
      where: { id },
      select: { questionId: true, isAccepted: true },
    });
    if (answer === null) return [];
    const { count } = await db.lessonAnswer.deleteMany({ where: { id } });
    if (count === 0) return [];
    if (answer.isAccepted) {
      await db.lessonQuestion.updateMany({
        where: { id: answer.questionId },
        data: { isResolved: false },
      });
    }
    return [{ surface: "LESSON_ANSWER", id }];
  },
  async reportable(viewerId, id) {
    const row = await prisma.lessonAnswer.findFirst({
      where: {
        id,
        isHidden: false,
        question: { isHidden: false, lesson: lessonsVisibleTo(viewerId) },
      },
      select: { userId: true },
    });
    return row === null ? null : { authorId: row.userId };
  },
  async authoredBy(userId) {
    const rows = await prisma.lessonAnswer.findMany({ where: { userId }, select: { id: true } });
    return rows.map((row) => row.id);
  },
  reviewIds: (content) => [content.id],
};

// ── Challenge solutions ────────────────────────────────────────────────────

const WRITEUP_SELECT = {
  id: true,
  content: true,
  isHidden: true,
  createdAt: true,
  user: AUTHOR,
  challenge: { select: { title: true, slug: true } },
} satisfies Prisma.ChallengeWriteupSelect;

type WriteupRow = Prisma.ChallengeWriteupGetPayload<{ select: typeof WRITEUP_SELECT }>;

function writeupContent(row: WriteupRow): ModeratedContent {
  return {
    surface: "CHALLENGE_WRITEUP",
    id: row.id,
    text: row.content,
    isHidden: row.isHidden,
    createdAt: row.createdAt,
    author: row.user,
    context: `Défi « ${row.challenge.title} »`,
    learnerPath: `/challenges/${row.challenge.slug}`,
    consolePath: null,
    opensThread: false,
    threadId: null,
    replies: 0,
    authorWithdrew: false,
  };
}

function writeupWhere(query: ConsoleContentQuery): Prisma.ChallengeWriteupWhereInput {
  return {
    ...hiddenFilter(query.hidden),
    ...(query.authorId !== undefined && { userId: query.authorId }),
    ...(query.q !== "" && {
      OR: [
        { content: contains(query.q) },
        { challenge: { title: contains(query.q) } },
        { user: authorMatches(query.q) },
      ],
    }),
  };
}

const challengeWriteupHandler: SurfaceHandler = {
  async read(db, ids) {
    const rows = await db.challengeWriteup.findMany({
      where: { id: { in: ids } },
      select: WRITEUP_SELECT,
    });
    return rows.map(writeupContent);
  },
  count: (query) => prisma.challengeWriteup.count({ where: writeupWhere(query) }),
  async list(query, window) {
    const rows = await prisma.challengeWriteup.findMany({
      where: writeupWhere(query),
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      ...window,
      select: WRITEUP_SELECT,
    });
    return rows.map(writeupContent);
  },
  async setHidden(db, id, hidden) {
    // Marked as the moderation's, so that its author publishing again does
    // not bring it back (writeupRepository.upsert): only the console does.
    const { count } = await db.challengeWriteup.updateMany({
      where: { id, isHidden: !hidden },
      data: { isHidden: hidden, hiddenByModeration: hidden },
    });
    return count > 0;
  },
  async destroy(db, id) {
    const { count } = await db.challengeWriteup.deleteMany({ where: { id } });
    return count === 0 ? [] : [{ surface: "CHALLENGE_WRITEUP", id }];
  },
  async reportable(viewerId, id) {
    // A solution is read only by the others who solved its challenge: the
    // rule of writeupBoardFor, and so the rule of who can report one.
    const row = await prisma.challengeWriteup.findFirst({
      where: { id, isHidden: false, challenge: { isActive: true } },
      select: { userId: true, challengeId: true },
    });
    if (row === null) return null;
    const progress = await prisma.userChallengeProgress.findUnique({
      where: { userId_challengeId: { userId: viewerId, challengeId: row.challengeId } },
      select: { status: true },
    });
    return progress?.status === "COMPLETED" ? { authorId: row.userId } : null;
  },
  async authoredBy(userId) {
    const rows = await prisma.challengeWriteup.findMany({
      where: { userId },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  },
  reviewIds: (content) => [content.id],
};

// ── Class resources ────────────────────────────────────────────────────────

const RESOURCE_SELECT = {
  id: true,
  title: true,
  body: true,
  url: true,
  isHidden: true,
  createdAt: true,
  createdBy: AUTHOR,
  class: { select: { id: true, name: true } },
} satisfies Prisma.ClassResourceSelect;

type ResourceRow = Prisma.ClassResourceGetPayload<{ select: typeof RESOURCE_SELECT }>;

function resourceContent(row: ResourceRow): ModeratedContent {
  const parts = [row.title, row.body ?? "", row.url ?? ""].filter((p) => p.trim() !== "");
  return {
    surface: "CLASS_RESOURCE",
    id: row.id,
    text: parts.join("\n\n"),
    isHidden: row.isHidden,
    createdAt: row.createdAt,
    author: row.createdBy,
    context: `Classe « ${row.class.name} »`,
    learnerPath: null,
    consolePath: `/classes/${row.class.id}`,
    opensThread: false,
    threadId: null,
    replies: 0,
    authorWithdrew: false,
  };
}

function resourceWhere(query: ConsoleContentQuery): Prisma.ClassResourceWhereInput {
  return {
    ...hiddenFilter(query.hidden),
    ...(query.authorId !== undefined && { createdById: query.authorId }),
    ...(query.q !== "" && {
      OR: [
        { title: contains(query.q) },
        { body: contains(query.q) },
        { url: contains(query.q) },
        { class: { name: contains(query.q) } },
        { createdBy: authorMatches(query.q) },
      ],
    }),
  };
}

const classResourceHandler: SurfaceHandler = {
  async read(db, ids) {
    const rows = await db.classResource.findMany({
      where: { id: { in: ids } },
      select: RESOURCE_SELECT,
    });
    return rows.map(resourceContent);
  },
  count: (query) => prisma.classResource.count({ where: resourceWhere(query) }),
  async list(query, window) {
    const rows = await prisma.classResource.findMany({
      where: resourceWhere(query),
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      ...window,
      select: RESOURCE_SELECT,
    });
    return rows.map(resourceContent);
  },
  async setHidden(db, id, hidden) {
    const { count } = await db.classResource.updateMany({
      where: { id, isHidden: !hidden },
      data: { isHidden: hidden },
    });
    return count > 0;
  },
  async destroy(db, id) {
    const { count } = await db.classResource.deleteMany({ where: { id } });
    return count === 0 ? [] : [{ surface: "CLASS_RESOURCE", id }];
  },
  async reportable(viewerId, id) {
    // A student of the class, reading it as the class page shows it: released,
    // and once the lesson is done when it waits for that.
    const row = await prisma.classResource.findFirst({
      where: { id, isHidden: false },
      select: { classId: true, createdById: true },
    });
    if (row === null) return null;
    const member = await prisma.classMember.findFirst({
      where: { classId: row.classId, userId: viewerId, class: LIVE_CLASS_FILTER },
      select: { userId: true },
    });
    if (member === null) return null;
    const readable = await classRepository.listResourcesForStudent(viewerId, [row.classId]);
    return readable.some((r) => r.id === id) ? { authorId: row.createdById } : null;
  },
  async authoredBy(userId) {
    const rows = await prisma.classResource.findMany({
      where: { createdById: userId },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  },
  reviewIds: (content) => [content.id],
};

const HANDLERS: Record<ContentSurface, SurfaceHandler> = {
  FORUM_POST: forumPostHandler,
  LESSON_QUESTION: lessonQuestionHandler,
  LESSON_ANSWER: lessonAnswerHandler,
  CHALLENGE_WRITEUP: challengeWriteupHandler,
  CLASS_RESOURCE: classResourceHandler,
};

async function readOne(
  db: Db,
  surface: ContentSurface,
  id: string,
): Promise<ModeratedContent | null> {
  const [content] = await HANDLERS[surface].read(db, [id]);
  return content ?? null;
}

/** A short copy of the text for the journal: the only one left after a deletion. */
function journalExcerpt(text: string): string {
  return text.length <= 300 ? text : `${text.slice(0, 299)}…`;
}

export const contentModerationRepository = {
  /**
   * The rows of these ids that still exist, for the report queue, each with
   * whether the screen's queue still holds it.
   */
  async read(surface: ContentSurface, ids: string[]): Promise<ReviewableContent[]> {
    if (ids.length === 0) return [];
    const handler = HANDLERS[surface];
    return withPending(prisma, handler, await handler.read(prisma, ids));
  },

  /**
   * Who wrote a piece of content this viewer can see, or null when they
   * cannot: hidden, gone, or out of their reach (a lesson of another class, a
   * solution to a challenge they have not solved, a resource of a class they
   * are not in). The same rules as the pages that show it.
   */
  async reportable(
    surface: ContentSurface,
    id: string,
    viewerId: string,
  ): Promise<{ authorId: string | null } | null> {
    return HANDLERS[surface].reportable(viewerId, id);
  },

  /**
   * Everything this account published, by surface: the ids, hidden or not.
   * What the reports about an author are looked up by (contentReportRepository):
   * a report names a content, and only the content's own table knows who
   * wrote it.
   */
  async authoredBy(userId: string): Promise<{ surface: ContentSurface; ids: string[] }[]> {
    return Promise.all(
      CONTENT_SURFACES.map(async (surface) => ({
        surface,
        ids: await HANDLERS[surface].authoredBy(userId),
      })),
    );
  },

  /**
   * One page of one surface, newest first, with the open reports and the
   * screen's pending decisions of the rows on it.
   */
  async listForConsole(query: ConsoleContentQuery): Promise<ConsoleSlice<ConsoleContentRow>> {
    const handler = HANDLERS[query.surface];
    const slice = await readSlice(
      query,
      () => handler.count(query),
      (window) => handler.list(query, window),
    );
    const ids = slice.rows.map((r) => r.id);
    const [reports, rows] = await Promise.all([
      ids.length === 0
        ? Promise.resolve([])
        : prisma.contentReport.groupBy({
            by: ["contentId"],
            where: { surface: query.surface, contentId: { in: ids }, status: "OPEN" },
            _count: { _all: true },
          }),
      withPending(prisma, handler, slice.rows),
    ]);
    const open = new Map(reports.map((r) => [r.contentId, r._count._all]));
    return {
      ...slice,
      rows: rows.map((row) => ({ ...row, openReports: open.get(row.id) ?? 0 })),
    };
  },

  /**
   * Hides, shows again or deletes one piece of content, with what goes with
   * it, in one transaction: the open reports about it closed (HIDDEN, or
   * DELETED for every row the deletion took), the journal's row, and the
   * author's notice.
   *
   * Refused, changing nothing, when the content is gone, already in the
   * state asked for (a second click, or a second moderator), still waiting
   * in the screen's queue, or, to be shown again, withdrawn by its author.
   */
  async apply(input: {
    surface: ContentSurface;
    id: string;
    gesture: ContentGesture;
    actorId: string;
    /** For the author; null to tell nobody. */
    notice: ContentNotice | null;
  }): Promise<ContentGestureResult> {
    const handler = HANDLERS[input.surface];
    return prisma.$transaction(async (tx): Promise<ContentGestureResult> => {
      const content = await readOne(tx, input.surface, input.id);
      if (content === null) return { ok: false, reason: "NOT_FOUND" };
      if ((await pendingIn(tx, handler.reviewIds(content))).size > 0) {
        return { ok: false, reason: "PENDING_REVIEW" };
      }
      if (input.gesture === "restore" && content.authorWithdrew) {
        return { ok: false, reason: "AUTHOR_WITHDRAWN" };
      }

      const now = new Date();
      let reportsClosed = 0;
      if (input.gesture === "delete") {
        const removed = await handler.destroy(tx, input.id);
        if (removed.length === 0) return { ok: false, reason: "NOT_FOUND" };
        reportsClosed = await closeReportsOfRemoved(tx, removed, input.actorId, now);
      } else {
        const hidden = input.gesture === "hide";
        if (!(await handler.setHidden(tx, input.id, hidden))) {
          return { ok: false, reason: "UNCHANGED" };
        }
        if (hidden) {
          const { count } = await tx.contentReport.updateMany({
            where: { surface: input.surface, contentId: input.id, status: "OPEN" },
            data: { status: "HIDDEN", resolvedAt: now, resolvedById: input.actorId },
          });
          reportsClosed = count;
        }
      }

      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          action: CONTENT_AUDIT_ACTION[input.gesture],
          targetType: input.surface,
          targetId: input.id,
          metadata: {
            authorId: content.author?.id ?? null,
            context: content.context,
            excerpt: journalExcerpt(content.text),
            reportsClosed,
            ...(content.opensThread && { opensThread: true, replies: content.replies }),
          },
        },
      });

      if (input.notice !== null && content.author !== null && content.author.id !== input.actorId) {
        await tx.notification.create({
          data: {
            userId: content.author.id,
            type: "MODERATION_ALERT",
            title: input.notice.title,
            body: input.notice.body,
            metadata: { gesture: input.gesture, surface: input.surface },
          },
        });
      }

      return { ok: true, content, reportsClosed };
    });
  },

  /**
   * Closes the open reports about one piece of content and leaves it as it
   * is: it was read, and kept. Journalled with how many it closed; nothing is
   * written when there was nothing open.
   */
  async dismissReports(input: {
    surface: ContentSurface;
    id: string;
    actorId: string;
  }): Promise<number> {
    return prisma.$transaction(async (tx) => {
      const { count } = await tx.contentReport.updateMany({
        where: { surface: input.surface, contentId: input.id, status: "OPEN" },
        data: { status: "DISMISSED", resolvedAt: new Date(), resolvedById: input.actorId },
      });
      if (count > 0) {
        await tx.auditLog.create({
          data: {
            actorId: input.actorId,
            action: CONTENT_AUDIT_ACTION.dismiss,
            targetType: input.surface,
            targetId: input.id,
            metadata: { reportsClosed: count },
          },
        });
      }
      return count;
    });
  },
};
