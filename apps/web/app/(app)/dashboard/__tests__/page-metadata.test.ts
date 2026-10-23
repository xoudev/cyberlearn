import { describe, expect, it, vi } from "vitest";

/**
 * The dashboard was the one page of the signed-in site with no title of its
 * own: its tab said the site's generic one. It is "Tableau de bord" now, which
 * the root layout's template turns into "Tableau de bord · CyberLearn".
 *
 * The page reads the database and the session when it renders, not when it is
 * imported: what it imports is stood in for, only its metadata is looked at.
 */

vi.mock("@cyberlearn/db", () => ({}));
vi.mock("@/lib/auth", () => ({ requireRequestUser: vi.fn() }));
vi.mock("@/lib/lessons/revisions-enabled", () => ({ revisionsEnabled: vi.fn() }));
vi.mock("@/lib/revisions/daily-recall", () => ({ dailyRecallState: vi.fn() }));
vi.mock("@/lib/paths/suggestions", () => ({ savedLearningAnswers: vi.fn() }));
vi.mock("@/lib/friends/friends-activity", () => ({ friendsActivityFor: vi.fn() }));
vi.mock("@/lib/social/duels", () => ({ listDuelInvitationsFor: vi.fn() }));
vi.mock("@/lib/tournaments/tournaments", () => ({ listTournamentsFor: vi.fn() }));

const { metadata } = await import("../page");

describe("the dashboard's metadata", () => {
  it("names the page", () => {
    expect(metadata.title).toBe("Tableau de bord");
  });
});
