export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  level: number;
  xpTotal: number;
  streakDays: number;
}
export declare const leaderboardRepository: {
  findTopUsers(limit?: number): Promise<LeaderboardEntry[]>;
  findUserRank(userId: string): Promise<number>;
};
//# sourceMappingURL=leaderboard.repository.d.ts.map
