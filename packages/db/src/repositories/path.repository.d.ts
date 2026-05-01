import type { ProgressStatus } from "@prisma/client";
export declare const pathRepository: {
  findBySlug(slug: string): Promise<{
    id: string;
    title: string;
    category: import("@prisma/client").$Enums.Category;
    slug: string;
  } | null>;
  findProgress(
    userId: string,
    pathId: string,
  ): Promise<{
    id: string;
    status: import("@prisma/client").$Enums.ProgressStatus;
    certificateId: string | null;
  } | null>;
  upsertProgress(data: {
    userId: string;
    pathId: string;
    status: ProgressStatus;
    completedAt?: Date;
  }): Promise<{
    id: string;
    userId: string;
    status: import("@prisma/client").$Enums.ProgressStatus;
    startedAt: Date;
    completedAt: Date | null;
    pathId: string;
    certificateId: string | null;
  }>;
  linkCertificate(
    userId: string,
    pathId: string,
    certificateId: string,
  ): Promise<{
    id: string;
    userId: string;
    status: import("@prisma/client").$Enums.ProgressStatus;
    startedAt: Date;
    completedAt: Date | null;
    pathId: string;
    certificateId: string | null;
  }>;
  /** Returns all published path IDs that contain a given lesson. */
  findPublishedPathsForLesson(lessonId: string): Promise<
    {
      id: string;
      slug: string;
      title: string;
    }[]
  >;
  /** Returns the IDs of all required lessons in a path. */
  findLessonIds(pathId: string): Promise<string[]>;
  /** Returns the count of COMPLETED lessons for a user within a specific path. */
  countCompletedLessons(userId: string, pathId: string): Promise<number>;
};
//# sourceMappingURL=path.repository.d.ts.map
