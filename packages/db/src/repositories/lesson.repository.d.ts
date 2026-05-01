import type { Category, Difficulty, ProgressStatus } from "@prisma/client";
export interface LessonFilters {
  category?: Category;
  difficulty?: Difficulty;
  /** Filter by user's progress status. Requires userId to be meaningful. */
  progressStatus?: ProgressStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}
export declare const lessonRepository: {
  /** Find a single published lesson by slug. Returns null if not found or not published. */
  findBySlug(slug: string): Promise<{
    id: string;
    title: string;
    category: import("@prisma/client").$Enums.Category;
    difficulty: import("@prisma/client").$Enums.Difficulty;
    refCode: string;
    slug: string;
    description: string;
    estimatedMinutes: number;
    xpReward: number;
    contentMdx: string;
    coverImageUrl: string | null;
    publishedAt: Date | null;
  } | null>;
  /** List published lessons with the user's progress joined. Used for the catalog page. */
  findManyWithProgress(
    userId: string,
    filters?: LessonFilters,
  ): Promise<{
    total: number;
    lessons: {
      id: string;
      slug: string;
      title: string;
      description: string;
      category: import("@prisma/client").$Enums.Category;
      difficulty: import("@prisma/client").$Enums.Difficulty;
      estimatedMinutes: number;
      xpReward: number;
      coverImageUrl: string | null;
      refCode: string;
      progressStatus: ProgressStatus | null;
    }[];
  }>;
  /** Count published lessons grouped by category. Used for filter badges. */
  countByCategory(): Promise<{
    [k: string]: number;
  }>;
  findProgress(
    userId: string,
    lessonId: string,
  ): Promise<{
    status: import("@prisma/client").$Enums.ProgressStatus;
    attempts: number;
    timeSpentSeconds: number;
    completedAt: Date | null;
  } | null>;
  /** First 3 users who completed a lesson (ordered by completedAt asc). Respects publicProfile. */
  findFirstBlood(lessonId: string): Promise<
    {
      user: {
        id: string;
        username: string | null;
        displayName: string;
        avatarUrl: string | null;
        preferences: {
          publicProfile: boolean;
        } | null;
      };
      completedAt: Date | null;
    }[]
  >;
  upsertProgress(data: {
    userId: string;
    lessonId: string;
    status: ProgressStatus;
    attempts?: number;
    completedAt?: Date;
  }): Promise<{
    id: string;
    userId: string;
    lessonId: string;
    status: import("@prisma/client").$Enums.ProgressStatus;
    attempts: number;
    bestScore: number | null;
    timeSpentSeconds: number;
    startedAt: Date;
    completedAt: Date | null;
    lastAccessedAt: Date;
  }>;
};
//# sourceMappingURL=lesson.repository.d.ts.map
