export declare const ratingRepository: {
  upsertLessonRating(
    userId: string,
    lessonId: string,
    score: number,
    feedback?: string,
  ): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    lessonId: string | null;
    pathId: string | null;
    score: number;
    feedback: string | null;
  }>;
  findUserLessonRating(
    userId: string,
    lessonId: string,
  ): Promise<{
    updatedAt: Date;
    score: number;
    feedback: string | null;
  } | null>;
  findLessonStats(lessonId: string): Promise<{
    avgRating: number | null;
    ratingsCount: number;
  } | null>;
};
//# sourceMappingURL=rating.repository.d.ts.map
