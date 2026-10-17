import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { PUBLISHED_PATH_LESSON } from "./path.repository.js";

/**
 * What a public profile shows beyond the user row: the badges it puts
 * forward, the paths with their progress, and what its owner gave the others.
 *
 * Who may read a profile is not decided here: the caller has already let the
 * reader in through userRepository.findPublicProfile, and passes the owner's
 * id it got from there.
 */

/**
 * How many of the owner's badges are weighed for "the rarest". Read the
 * highest rarity first, so the few put forward are always among them; the
 * number of holders only breaks ties inside that head.
 */
const RAREST_CANDIDATES = 24;

/**
 * The paths a profile lists: this many going on, and as many finished. Read
 * apart, so neither kind crowds the other out (pathsOf).
 */
const PROFILE_PATHS = 12;

/** A path on a profile: its state, and its missions counted. */
const PATH_ROW = {
  status: true,
  completedAt: true,
  path: {
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      _count: { select: { lessons: { where: PUBLISHED_PATH_LESSON } } },
    },
  },
} as const satisfies Prisma.UserPathProgressSelect;

export interface BadgeCandidate {
  id: string;
  name: string;
  rarity: string;
  iconUrl: string | null;
  earnedAt: Date;
  /** How many people hold it, the owner included. */
  holders: number;
}

export interface ProfilePathRow {
  slug: string;
  title: string;
  category: string;
  completed: boolean;
  /** The path's published lessons the owner finished. */
  done: number;
  /** The path's published lessons. */
  total: number;
  completedAt: Date | null;
}

export interface ContributionTally {
  posts: number;
  topics: number;
  answers: number;
  acceptedAnswers: number;
  writeups: number;
}

export const profileRepository = {
  /**
   * The owner's badges most worth putting forward, each with how many people
   * hold it: @cyberlearn/lib/social/portfolio's rarestBadges picks from them.
   * The enum sorts in its declared order (COMMON up to LEGENDARY), so the
   * highest rarity comes first.
   */
  async badgeCandidates(userId: string): Promise<BadgeCandidate[]> {
    const held = await prisma.userBadge.findMany({
      where: { userId },
      orderBy: [{ badge: { rarity: "desc" } }, { earnedAt: "desc" }],
      take: RAREST_CANDIDATES,
      select: {
        id: true,
        badgeId: true,
        earnedAt: true,
        badge: { select: { name: true, rarity: true, iconUrl: true } },
      },
    });
    if (held.length === 0) return [];

    const counted = await prisma.userBadge.groupBy({
      by: ["badgeId"],
      where: { badgeId: { in: held.map((row) => row.badgeId) } },
      _count: { _all: true },
    });
    const holders = new Map(counted.map((row) => [row.badgeId, row._count._all]));
    return held.map((row) => ({
      id: row.id,
      name: row.badge.name,
      rarity: row.badge.rarity,
      iconUrl: row.badge.iconUrl,
      earnedAt: row.earnedAt,
      holders: holders.get(row.badgeId) ?? 1,
    }));
  },

  /**
   * The owner's paths, going on and finished, with how many of their
   * missions are done. Catalogue paths only: a path a teacher built for a
   * class is the class's, and a profile never says which class somebody is in
   * (CATALOGUE_PATH keeps them off every public list for the same reason).
   * A mission is a published lesson of the path (PUBLISHED_PATH_LESSON), the
   * rule the path's own page counts with.
   *
   * The paths going on and the ones finished are two reads, each bounded:
   * one read ordered by completion put every path going on first, so
   * somebody with a dozen of them showed none finished, and the timeline,
   * which takes the finished ones most recent first, lost them all. The
   * finished ones come most recent first, so their head is the timeline's.
   */
  async pathsOf(userId: string): Promise<ProfilePathRow[]> {
    const [going, completed] = await Promise.all([
      prisma.userPathProgress.findMany({
        where: { userId, status: "IN_PROGRESS", path: { audience: "CATALOGUE" } },
        orderBy: { startedAt: "desc" },
        take: PROFILE_PATHS,
        select: PATH_ROW,
      }),
      prisma.userPathProgress.findMany({
        where: { userId, status: "COMPLETED", path: { audience: "CATALOGUE" } },
        // Postgres puts nulls first in a descending sort: a completion without
        // a date goes last rather than ahead of every dated one.
        orderBy: [{ completedAt: { sort: "desc", nulls: "last" } }, { startedAt: "desc" }],
        take: PROFILE_PATHS,
        select: PATH_ROW,
      }),
    ]);
    const rows = [...going, ...completed];
    if (rows.length === 0) return [];

    const finished = await prisma.pathLesson.groupBy({
      by: ["pathId"],
      where: {
        pathId: { in: rows.map((row) => row.path.id) },
        lesson: { status: "PUBLISHED", progress: { some: { userId, status: "COMPLETED" } } },
      },
      _count: { _all: true },
    });
    const done = new Map(finished.map((row) => [row.pathId, row._count._all]));
    return rows.map((row) => ({
      slug: row.path.slug,
      title: row.path.title,
      category: row.path.category,
      completed: row.status === "COMPLETED",
      done: done.get(row.path.id) ?? 0,
      total: row.path._count.lessons,
      completedAt: row.completedAt,
    }));
  },

  /**
   * What the owner gave the others, as anybody can still read it: forum
   * messages (the opening ones included, in threads still shown), answers
   * under lessons and the accepted ones, challenge solutions. Nothing hidden
   * by moderation counts.
   */
  async contributionsOf(userId: string): Promise<ContributionTally> {
    const [posts, topics, answers, acceptedAnswers, writeups] = await Promise.all([
      prisma.forumPost.count({
        where: { authorId: userId, isHidden: false, topic: { isHidden: false } },
      }),
      prisma.forumTopic.count({ where: { authorId: userId, isHidden: false } }),
      prisma.lessonAnswer.count({
        where: { userId, isHidden: false, question: { isHidden: false } },
      }),
      prisma.lessonAnswer.count({
        where: { userId, isHidden: false, isAccepted: true, question: { isHidden: false } },
      }),
      prisma.challengeWriteup.count({ where: { userId, isHidden: false } }),
    ]);
    return { posts, topics, answers, acceptedAnswers, writeups };
  },
};
