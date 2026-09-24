import { reviewMinutes, reviewXpFor } from "@cyberlearn/lib/revisions/review-display";
import type { Category, Difficulty } from "@/lib/db";

/**
 * The app's revisions queue, read under RLS (own review_schedules). Grading
 * goes through the site's service (/api/mobile/review); this only shapes rows.
 */

export interface ReviewItem {
  scheduleId: string;
  lessonId: string;
  slug: string;
  title: string;
  category: Category;
  difficulty: Difficulty;
  xpReward: number;
  nextReviewAt: string;
}

interface ReviewLesson {
  id: string;
  slug: string;
  title: string;
  category: Category;
  difficulty: Difficulty;
  xpReward: number;
}

export interface RawReviewRow {
  id: string;
  nextReviewAt: string;
  /** Embedded to-one relation: supabase-js may hand it back as an array. */
  lesson: ReviewLesson | ReviewLesson[] | null;
}

export const REVIEW_COLUMNS =
  "id,nextReviewAt,lesson:lessons(id,slug,title,category,difficulty,xpReward)";

export function toReviewItems(rows: readonly RawReviewRow[]): ReviewItem[] {
  return rows.flatMap((r) => {
    const lesson = Array.isArray(r.lesson) ? (r.lesson[0] ?? null) : r.lesson;
    // A lesson the learner can no longer read (unpublished) is not offered.
    if (!lesson) return [];
    return [
      {
        scheduleId: r.id,
        lessonId: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        category: lesson.category,
        difficulty: lesson.difficulty,
        xpReward: lesson.xpReward,
        nextReviewAt: r.nextReviewAt,
      },
    ];
  });
}

/** Due now (oldest first), and the next few after, as the site shows them. */
export function splitReviews(
  items: readonly ReviewItem[],
  now: Date,
  upcomingLimit = 10,
): { due: ReviewItem[]; upcoming: ReviewItem[] } {
  const sorted = [...items].sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt));
  const due = sorted.filter((i) => new Date(i.nextReviewAt).getTime() <= now.getTime());
  const upcoming = sorted
    .filter((i) => new Date(i.nextReviewAt).getTime() > now.getTime())
    .slice(0, upcomingLimit);
  return { due, upcoming };
}

/** How many are due, the minutes they take, and the most they can earn. */
export function reviewSummary(due: readonly ReviewItem[]): {
  count: number;
  minutes: number;
  xp: number;
} {
  return {
    count: due.length,
    minutes: due.reduce((n, i) => n + reviewMinutes(i.difficulty), 0),
    xp: due.reduce((n, i) => n + reviewXpFor(i.xpReward), 0),
  };
}
