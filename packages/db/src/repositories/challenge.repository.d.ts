import type { Category, Difficulty, ChallengeType, ProgressStatus } from "@prisma/client";
export interface ChallengeWithProgress {
  id: string;
  refCode: string;
  slug: string;
  title: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  type: ChallengeType;
  xpReward: number;
  timeLimitMin: number;
  maxAttempts: number;
  isActive: boolean;
  orderIndex: number;
  prerequisiteId: string | null;
  userStatus: ProgressStatus | null;
  userAttempts: number;
  userCompletedAt: Date | null;
}
export declare const challengeRepository: {
  findAllActive(userId: string): Promise<ChallengeWithProgress[]>;
  findBySlug(slug: string): Promise<{
    id: string;
    type: import("@prisma/client").$Enums.ChallengeType;
    title: string;
    _count: {
      progress: number;
    };
    category: import("@prisma/client").$Enums.Category;
    difficulty: import("@prisma/client").$Enums.Difficulty;
    orderIndex: number;
    refCode: string;
    slug: string;
    description: string;
    xpReward: number;
    prerequisiteId: string | null;
    instructions: string;
    timeLimitMin: number;
    maxAttempts: number;
    starterCode: string | null;
    attachmentUrl: string | null;
    resourceUrl: string | null;
    prerequisite: {
      title: string;
    } | null;
    hints: {
      id: string;
      orderIndex: number;
      xpCost: number;
    }[];
  } | null>;
  findByIdForAdmin(id: string): Promise<{
    id: string;
    type: import("@prisma/client").$Enums.ChallengeType;
    title: string;
    _count: {
      progress: number;
    };
    category: import("@prisma/client").$Enums.Category;
    difficulty: import("@prisma/client").$Enums.Difficulty;
    orderIndex: number;
    isActive: boolean;
    refCode: string;
    slug: string;
    description: string;
    xpReward: number;
    prerequisiteId: string | null;
    instructions: string;
    timeLimitMin: number;
    maxAttempts: number;
    flag: string | null;
    starterCode: string | null;
    attachmentUrl: string | null;
    resourceUrl: string | null;
    hints: {
      id: string;
      content: string;
      orderIndex: number;
      xpCost: number;
    }[];
  } | null>;
  getRevealedHintIds(userId: string, challengeId: string): Promise<string[]>;
  revealHint(
    userId: string,
    hintId: string,
  ): Promise<{
    content: string;
    xpCost: number;
  } | null>;
  getUserProgress(
    userId: string,
    challengeId: string,
  ): Promise<{
    id: string;
    userId: string;
    status: import("@prisma/client").$Enums.ProgressStatus;
    attempts: number;
    startedAt: Date;
    completedAt: Date | null;
    challengeId: string;
  } | null>;
  startChallenge(
    userId: string,
    challengeId: string,
  ): Promise<{
    id: string;
    userId: string;
    status: import("@prisma/client").$Enums.ProgressStatus;
    attempts: number;
    startedAt: Date;
    completedAt: Date | null;
    challengeId: string;
  }>;
  completeChallenge(
    userId: string,
    challengeId: string,
  ): Promise<{
    id: string;
    userId: string;
    status: import("@prisma/client").$Enums.ProgressStatus;
    attempts: number;
    startedAt: Date;
    completedAt: Date | null;
    challengeId: string;
  }>;
  countCompleted(userId: string): Promise<number>;
  getRevealedHintsWithContent(
    userId: string,
    challengeId: string,
  ): Promise<
    {
      hintId: string;
      content: string;
    }[]
  >;
  findAdjacentChallenges(
    currentId: string,
    currentOrderIndex: number,
  ): Promise<{
    prev: {
      slug: string;
      title: string;
    } | null;
    next: {
      slug: string;
      title: string;
    } | null;
  }>;
  getFirstBlood(challengeId: string): Promise<{
    displayName: string;
  } | null>;
};
//# sourceMappingURL=challenge.repository.d.ts.map
