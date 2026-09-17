/**
 * The revisions switch, and the surfaces that have to agree with it.
 *
 * The failure this guards against is not a wrong answer from one query - it is
 * five places reading the same preference and one of them forgetting. That
 * shows up as a switch that appears to do nothing, which is worse than no
 * switch at all, so what is asserted here is the shared helper's answer plus
 * the fact that every surface goes through it.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@cyberlearn/db", () => ({ prisma: { userPreferences: { findUnique } } }));

const { revisionsEnabled } = await import("../revisions-enabled");

function repoRoot(): string {
  let dir = process.cwd();
  while (!existsSync(join(dir, "pnpm-workspace.yaml"))) {
    const up = dirname(dir);
    if (up === dir) throw new Error("racine du dépôt introuvable");
    dir = up;
  }
  return dir;
}

const WEB = join(repoRoot(), "apps/web");

describe("revisionsEnabled", () => {
  beforeEach(() => {
    findUnique.mockReset();
  });

  it("is on when the preference says so", async () => {
    findUnique.mockResolvedValue({ spacedRepetition: true });
    expect(await revisionsEnabled("u-1")).toBe(true);
  });

  it("is off when the preference says so", async () => {
    findUnique.mockResolvedValue({ spacedRepetition: false });
    expect(await revisionsEnabled("u-1")).toBe(false);
  });

  it("is on for an account that has never expressed a choice", async () => {
    // Pre-onboarding accounts have no preferences row, and the column defaults
    // to true. Treating the absence as "off" would silently disable the feature
    // for everyone who has not been through onboarding yet.
    findUnique.mockResolvedValue(null);
    expect(await revisionsEnabled("u-1")).toBe(true);
  });
});

describe("the surfaces that have to obey it", () => {
  const SURFACES = [
    // Fills the queue.
    "lib/lessons/complete.ts",
    // The entry in the navigation.
    "components/app-sidebar.tsx",
    // The section on the dashboard.
    "app/(app)/dashboard/page.tsx",
    // The page itself.
    "app/(app)/revisions/page.tsx",
  ];

  it.each(SURFACES)("%s reads the shared helper rather than the column", (file) => {
    const source = readFileSync(join(WEB, file), "utf8");
    expect(source).toContain("revisionsEnabled");
  });

  it("the reminder cron requires both switches, not just the e-mail one", () => {
    const source = readFileSync(join(WEB, "app/api/cron/review-reminders/route.ts"), "utf8");
    // Reading reviewReminders alone would keep mailing about a queue the reader
    // has said they do not want to have at all.
    expect(source).toContain("spacedRepetition: true");
    expect(source).toContain("reviewReminders: true");
  });
});
