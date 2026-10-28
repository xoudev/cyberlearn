import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildBadgeCriterionStats, computeBadgeProgress } from "@cyberlearn/lib";

/**
 * The twelve badges of challenges, duels, tournaments and the daily recall
 * reach production through a data migration, not through code: a typo in a
 * criterion would leave a badge nobody can earn, and a wrong icon path a
 * blank medallion, with nothing failing. This reads the migration as the
 * database will, and checks each badge against the evaluator and the icons
 * the site serves.
 */

const WEB = join(__dirname, "..", "..", "..");
const MIGRATION = join(
  WEB,
  "..",
  "..",
  "packages/db/prisma/migrations/20261028120000_activity_badges/migration.sql",
);

interface MigratedBadge {
  refCode: string;
  name: string;
  iconUrl: string;
  rarity: string;
  criterionType: string;
  criterionData: unknown;
}

const ROW =
  /\(gen_random_uuid\(\), '(CL-BDG-\d{3})', '((?:[^']|'')*)', '((?:[^']|'')*)', '([^']+)', '(\w+)', '(\w+)', '([^']+)'::jsonb, 0, true, CURRENT_TIMESTAMP\)/g;

function migratedBadges(): MigratedBadge[] {
  const sql = readFileSync(MIGRATION, "utf8");
  return [...sql.matchAll(ROW)].map((match) => {
    const criterionData: unknown = JSON.parse(match[7] ?? "null");
    return {
      refCode: match[1] ?? "",
      name: (match[2] ?? "").replace(/''/g, "'"),
      iconUrl: match[4] ?? "",
      rarity: match[5] ?? "",
      criterionType: match[6] ?? "",
      criterionData,
    };
  });
}

/** An account that has done nothing yet. */
const NOTHING = buildBadgeCriterionStats(
  {
    completedLessons: [],
    completedPathIds: [],
    totalCertificates: 0,
    perfectQuizCount: 0,
    earnedBadgeRefCodes: [],
    placementScores: null,
  },
  { xpTotal: 0, streakDays: 0 },
);

describe("the activity badges migration", () => {
  const badges = migratedBadges();

  it("adds twelve badges, each with its own code and name", () => {
    expect(badges).toHaveLength(12);
    expect(new Set(badges.map((b) => b.refCode)).size).toBe(12);
    expect(new Set(badges.map((b) => b.name)).size).toBe(12);
  });

  it.each(badges.map((b) => [b.name, b]))("%s points at an icon the site serves", (_n, badge) => {
    expect(badge.iconUrl).toMatch(/^\/badges\/[a-z0-9-]+\.svg$/);
    expect(existsSync(join(WEB, "public", badge.iconUrl))).toBe(true);
  });

  it.each(badges.map((b) => [b.name, b]))(
    "%s has a criterion the evaluator can count towards",
    (_n, badge) => {
      const progress = computeBadgeProgress(badge.criterionType, badge.criterionData, NOTHING);
      expect(progress).not.toBeNull();
      expect(progress?.done).toBe(0);
      expect(progress?.total).toBeGreaterThan(0);
    },
  );

  it("unlocks the podium and the win on the places they name", () => {
    const podium = badges.find((b) => b.name === "Podium");
    const champion = badges.find((b) => b.name === "Champion");
    const second = { ...NOTHING, tournamentRanks: [2] };
    expect(computeBadgeProgress("TOURNAMENT_RANK", podium?.criterionData, second)).toEqual({
      done: 1,
      total: 1,
    });
    expect(computeBadgeProgress("TOURNAMENT_RANK", champion?.criterionData, second)).toEqual({
      done: 0,
      total: 1,
    });
  });
});
