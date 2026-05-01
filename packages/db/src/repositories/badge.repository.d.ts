export declare const badgeRepository: {
  /** All active badges — loaded once per request for badge evaluation. */
  findAllActive(): Promise<
    {
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
    }[]
  >;
  /** Set of badge IDs already earned by a user — used to skip re-evaluation. */
  findUserBadgeIds(userId: string): Promise<ReadonlySet<string>>;
  /** All badges earned by a user, with badge details. */
  findUserBadges(userId: string): Promise<
    ({
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
    })[]
  >;
};
//# sourceMappingURL=badge.repository.d.ts.map
