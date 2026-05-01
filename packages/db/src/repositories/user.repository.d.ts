export declare const userRepository: {
  /** Minimal user data needed for XP + streak computation on lesson completion. */
  findForGamification(userId: string): Promise<{
    xpTotal: number;
    level: number;
    streakDays: number;
    lastActiveAt: Date;
  } | null>;
  /** Total completed lessons count + per-category breakdown for badge evaluation. */
  countCompletedLessonsByCategory(userId: string): Promise<{
    total: number;
    byCategory: Partial<Record<string, number>>;
  }>;
  /** Full profile data for authenticated user's own profile page. */
  findProfile(userId: string): Promise<
    | ({
        preferences: {
          userId: string;
          theme: string;
          locale: string;
          emailNotifications: boolean;
          reviewReminders: boolean;
          weeklyDigest: boolean;
          publicProfile: boolean;
        } | null;
        lessonProgress: {
          lessonId: string;
          completedAt: Date | null;
          lesson: {
            title: string;
            category: import("@prisma/client").$Enums.Category;
            slug: string;
            xpReward: number;
          };
        }[];
        badges: ({
          badge: {
            name: string;
            id: string;
            createdAt: Date;
            isActive: boolean;
            refCode: string;
            description: string;
            xpReward: number;
            iconUrl: string;
            rarity: import("@prisma/client").$Enums.BadgeRarity;
            criterionType: import("@prisma/client").$Enums.BadgeCriterionType;
            criterionData: import("@prisma/client/runtime/library").JsonValue;
          };
        } & {
          id: string;
          userId: string;
          badgeId: string;
          earnedAt: Date;
          context: import("@prisma/client/runtime/library").JsonValue | null;
        })[];
      } & {
        id: string;
        email: string;
        username: string | null;
        displayName: string;
        avatarUrl: string | null;
        bio: string | null;
        role: import("@prisma/client").$Enums.UserRole;
        xpTotal: number;
        level: number;
        streakDays: number;
        lastActiveAt: Date;
        createdAt: Date;
        updatedAt: Date;
      })
    | null
  >;
  /** Public profile by username — returns null if not found or profile is private. */
  findPublicProfile(username: string): Promise<
    | ({
        preferences: {
          publicProfile: boolean;
        } | null;
        lessonProgress: {
          completedAt: Date | null;
          lesson: {
            title: string;
            category: import("@prisma/client").$Enums.Category;
            slug: string;
          };
        }[];
        badges: ({
          badge: {
            name: string;
            id: string;
            createdAt: Date;
            isActive: boolean;
            refCode: string;
            description: string;
            xpReward: number;
            iconUrl: string;
            rarity: import("@prisma/client").$Enums.BadgeRarity;
            criterionType: import("@prisma/client").$Enums.BadgeCriterionType;
            criterionData: import("@prisma/client/runtime/library").JsonValue;
          };
        } & {
          id: string;
          userId: string;
          badgeId: string;
          earnedAt: Date;
          context: import("@prisma/client/runtime/library").JsonValue | null;
        })[];
      } & {
        id: string;
        email: string;
        username: string | null;
        displayName: string;
        avatarUrl: string | null;
        bio: string | null;
        role: import("@prisma/client").$Enums.UserRole;
        xpTotal: number;
        level: number;
        streakDays: number;
        lastActiveAt: Date;
        createdAt: Date;
        updatedAt: Date;
      })
    | null
  >;
};
//# sourceMappingURL=user.repository.d.ts.map
