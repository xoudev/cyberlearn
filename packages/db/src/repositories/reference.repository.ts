import type {
  Category,
  CosmeticType,
  Difficulty,
  Prisma,
  QuestType,
  SeasonStatus,
} from "@prisma/client";
import { prisma } from "../prisma.js";
import { readSlice, type ConsolePage, type ConsoleSlice } from "./console-page.js";

/**
 * The reference data the console shows and never edits: cosmetics, weekly
 * quests, league seasons, forum sections and placement questions.
 *
 * None of it is written by hand. The cosmetics and the placement questions
 * are upserted by the seeds on every run, the quests and the forum sections
 * were inserted by their migrations, and the seasons are opened by the
 * rollover job. An edit made in the console would be overwritten by the next
 * seed, or would leave the database saying something the repository does not:
 * so the console reads them, one page at a time, and says where they come from.
 */

export interface ReferenceQuery extends ConsolePage {
  /** Part of a name, a code or a text; empty for none. */
  q: string;
}

interface Contains {
  contains: string;
  mode: "insensitive";
}

/**
 * The search box as one OR: a case-insensitive "contains" on each field the
 * callback names. Null when the box is empty.
 */
function search<W>(q: string, fields: (term: Contains) => W[]): { OR: W[] } | null {
  const term = q.trim();
  return term === "" ? null : { OR: fields({ contains: term, mode: "insensitive" }) };
}

/** The terms of an AND, the empty ones left out. */
function allOf<W>(terms: readonly (W | null | undefined)[]): { AND: W[] } {
  return { AND: terms.filter((t): t is W => t !== null && t !== undefined) };
}

// ─── Cosmetics ──────────────────────────────────────────────────────────────

export interface CosmeticReferenceQuery extends ReferenceQuery {
  type: CosmeticType | undefined;
}

const COSMETIC_ROW = {
  id: true,
  code: true,
  type: true,
  label: true,
  description: true,
  rarity: true,
  criterionType: true,
  criterionData: true,
  orderIndex: true,
  isActive: true,
  _count: { select: { unlocks: true } },
} as const satisfies Prisma.CosmeticSelect;

export type CosmeticReferenceRow = Prisma.CosmeticGetPayload<{ select: typeof COSMETIC_ROW }>;

export function cosmeticReferenceWhere(query: CosmeticReferenceQuery): Prisma.CosmeticWhereInput {
  return allOf<Prisma.CosmeticWhereInput>([
    query.type !== undefined ? { type: query.type } : null,
    search(query.q, (c) => [{ label: c }, { code: c }, { description: c }]),
  ]);
}

// ─── Quests ─────────────────────────────────────────────────────────────────

export interface QuestReferenceQuery extends ReferenceQuery {
  type: QuestType | undefined;
}

const QUEST_ROW = {
  id: true,
  code: true,
  title: true,
  description: true,
  type: true,
  target: true,
  xpReward: true,
  freezeReward: true,
  orderIndex: true,
  isActive: true,
} as const satisfies Prisma.QuestSelect;

export type QuestReferenceRow = Prisma.QuestGetPayload<{ select: typeof QUEST_ROW }>;

export function questReferenceWhere(query: QuestReferenceQuery): Prisma.QuestWhereInput {
  return allOf<Prisma.QuestWhereInput>([
    query.type !== undefined ? { type: query.type } : null,
    search(query.q, (c) => [{ title: c }, { code: c }, { description: c }]),
  ]);
}

// ─── Seasons ────────────────────────────────────────────────────────────────

/** Seasons have no text to search: a status, and a page. */
export interface SeasonReferenceQuery extends ConsolePage {
  status: SeasonStatus | undefined;
}

const SEASON_ROW = {
  id: true,
  index: true,
  startsAt: true,
  endsAt: true,
  status: true,
  _count: { select: { memberships: true } },
} as const satisfies Prisma.SeasonSelect;

export type SeasonReferenceRow = Prisma.SeasonGetPayload<{ select: typeof SEASON_ROW }>;

// ─── Forum sections ─────────────────────────────────────────────────────────

const FORUM_CATEGORY_ROW = {
  id: true,
  slug: true,
  name: true,
  description: true,
  accent: true,
  position: true,
  _count: { select: { topics: true } },
} as const satisfies Prisma.ForumCategorySelect;

export type ForumCategoryReferenceRow = Prisma.ForumCategoryGetPayload<{
  select: typeof FORUM_CATEGORY_ROW;
}>;

export function forumCategoryReferenceWhere(query: ReferenceQuery): Prisma.ForumCategoryWhereInput {
  return allOf<Prisma.ForumCategoryWhereInput>([
    search(query.q, (c) => [{ name: c }, { slug: c }, { description: c }]),
  ]);
}

// ─── Placement questions ────────────────────────────────────────────────────

export interface PlacementReferenceQuery extends ReferenceQuery {
  category: Category | undefined;
  difficulty: Difficulty | undefined;
}

/**
 * The right answer is read too: the console is where the team checks that the
 * key matches the options. It never reaches a learner from here, and the
 * column stays closed to the Data API (20260725000000_rls_column_hardening).
 */
const PLACEMENT_ROW = {
  id: true,
  category: true,
  difficulty: true,
  question: true,
  options: true,
  correctOptionId: true,
  explanation: true,
  orderIndex: true,
  isActive: true,
} as const satisfies Prisma.PlacementQuestionSelect;

export type PlacementReferenceRow = Prisma.PlacementQuestionGetPayload<{
  select: typeof PLACEMENT_ROW;
}>;

export function placementReferenceWhere(
  query: PlacementReferenceQuery,
): Prisma.PlacementQuestionWhereInput {
  return allOf<Prisma.PlacementQuestionWhereInput>([
    query.category !== undefined ? { category: query.category } : null,
    query.difficulty !== undefined ? { difficulty: query.difficulty } : null,
    search(query.q, (c) => [{ question: c }, { explanation: c }]),
  ]);
}

export const referenceRepository = {
  /** The cosmetics, by slot then in the locker's order, with how many accounts unlocked each. */
  async listCosmetics(query: CosmeticReferenceQuery): Promise<ConsoleSlice<CosmeticReferenceRow>> {
    const where = cosmeticReferenceWhere(query);
    return readSlice(
      query,
      () => prisma.cosmetic.count({ where }),
      ({ skip, take }) =>
        prisma.cosmetic.findMany({
          where,
          orderBy: [{ type: "asc" }, { orderIndex: "asc" }, { id: "asc" }],
          skip,
          take,
          select: COSMETIC_ROW,
        }),
    );
  },

  /** The weekly quests, in the order the dashboard shows them. */
  async listQuests(query: QuestReferenceQuery): Promise<ConsoleSlice<QuestReferenceRow>> {
    const where = questReferenceWhere(query);
    return readSlice(
      query,
      () => prisma.quest.count({ where }),
      ({ skip, take }) =>
        prisma.quest.findMany({
          where,
          orderBy: [{ orderIndex: "asc" }, { id: "asc" }],
          skip,
          take,
          select: QUEST_ROW,
        }),
    );
  },

  /** The league seasons, the latest first, with how many players each placed. */
  async listSeasons(query: SeasonReferenceQuery): Promise<ConsoleSlice<SeasonReferenceRow>> {
    const where: Prisma.SeasonWhereInput =
      query.status !== undefined ? { status: query.status } : {};
    return readSlice(
      query,
      () => prisma.season.count({ where }),
      ({ skip, take }) =>
        prisma.season.findMany({
          where,
          orderBy: [{ index: "desc" }],
          skip,
          take,
          select: SEASON_ROW,
        }),
    );
  },

  /** The forum's sections, in the forum's order, with how many topics each holds. */
  async listForumCategories(
    query: ReferenceQuery,
  ): Promise<ConsoleSlice<ForumCategoryReferenceRow>> {
    const where = forumCategoryReferenceWhere(query);
    return readSlice(
      query,
      () => prisma.forumCategory.count({ where }),
      ({ skip, take }) =>
        prisma.forumCategory.findMany({
          where,
          orderBy: [{ position: "asc" }, { id: "asc" }],
          skip,
          take,
          select: FORUM_CATEGORY_ROW,
        }),
    );
  },

  /** The placement test's questions, by domain then in the test's order. */
  async listPlacementQuestions(
    query: PlacementReferenceQuery,
  ): Promise<ConsoleSlice<PlacementReferenceRow>> {
    const where = placementReferenceWhere(query);
    return readSlice(
      query,
      () => prisma.placementQuestion.count({ where }),
      ({ skip, take }) =>
        prisma.placementQuestion.findMany({
          where,
          orderBy: [{ category: "asc" }, { orderIndex: "asc" }, { id: "asc" }],
          skip,
          take,
          select: PLACEMENT_ROW,
        }),
    );
  },
};
